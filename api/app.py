from typing import Union
import uuid
import shutil
from threading import Thread
from time import sleep
import pathlib, os
from typing import Dict, Any
import json 
import time
import gc

from fastapi import FastAPI, HTTPException
# from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from llama_cpp import Llama

class Lesion(BaseModel):
    start_offset: int
    end_offset: int

class Prompt(BaseModel):
    prompt: str

app = FastAPI()
app.SESSIONS = {}
MODEL_PATH = "models/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf"

@app.get("/api/setup")
def begin_session():
    if len(app.SESSIONS.keys()) > 0:
        raise HTTPException(status_code=503, detail="Application in use")
    session_id = str(uuid.uuid4())
    setup_model(session_id)
    app.SESSIONS[session_id] = setup_model(session_id)
    Thread(target=session_timeout, args=(session_id,)).start()
    return {"session_id": session_id}

@app.post("/api/lesion")
def apply_lesion(session: str, lesion: Lesion):
    if app.SESSIONS.get(session) is None:
        raise HTTPException(status_code=503, detail="Session not found")
    apply_lesion_job(session, lesion.start_offset, lesion.end_offset)
    return {"Success": "Success"}

# async def stream_chat(llm, prompt):
#     output = llm(
#         prompt,
#         max_tokens=100,
#         stop=["user:", "\n"],
#     )

#     for chunk in output:
#         print(chunk)
#         delta = chunk['choices'][0]['text']
#         data = json.dumps(delta)
#         # if 'role' in delta:
#         #     print(delta['role'], end=': ')
#         #     data = json.dumps(delta)
#         # elif 'content' in delta:
#         #     print(delta['content'], end='')
#         #     data = json.dumps(delta)
#         yield f"data: {data}\n\n"

@app.post("/api/prompt")
def prompt(session: str, prompt: Prompt): 
    llm = app.SESSIONS.get(session) 
    if llm is None:
        raise HTTPException(status_code=503, detail="Session not found")
    full_prompt = '''
    <context>
    You are a large language model embedded in a webpage. 
    The numerical weights of your model, that are stored in tensors in the model's binary file, are visualized to your left. 
    In this application, the user has access to manipulate the contents of these weights.
    The weights are visualized as sequrence in a 2d representation of the bytes that store them in your binary file.
    They will remove chunks of these weights and replace them with 0 values.
    Then, will chat with you to see how you respond to the changes in the weights.
    </context>
    <instructions>
    - Respond to the user's chat messages. Be normal, and do your best to answer their questions. 
    - You will have access to the entire history of the conversation in the <history> tags.
    - The user's queries will be inside the <query> tags.
    - Include your responses in the <response> tags.
    - Do not include any xml content in your responses, only normal text.
    </instructions>
    ''' + prompt.prompt
    try:
        output = llm(
            full_prompt,
            max_tokens=200,
            stop=["</response>"],
        )
    except Exception as e:
        cleanup(session)
        return {"Error": ""}
        
    return output

def setup_model(session):
    shutil.copyfile(MODEL_PATH, MODEL_PATH.replace(".gguf", f"-{session}.gguf"))
    return Llama(
        model_path=MODEL_PATH.replace(".gguf", f"-{session}.gguf"),
        n_gpu_layers=-1, # Uncomment to use GPU acceleration
        # seed=1337, # Uncomment to set a specific seed
        n_ctx=2048, # Uncomment to increase the context window
    )

def cleanup(session):
    os.remove(MODEL_PATH.replace(".gguf", f"-{session}.gguf"))
    del app.SESSIONS[session]

def session_timeout(session):
    sleep(3600) # 1 hour
    cleanup(session)

# time this function
def apply_lesion_job(session, start_offset, end_offset):

    start_time = time.time()
    WEIGHTS_OFFSET = 0x007793C0
    del app.SESSIONS[session]# NOTE: does this free the memory, can I manually free?
    with open(MODEL_PATH.replace(".gguf", f"-{session}.gguf"), "r+b") as f:
        f.seek(WEIGHTS_OFFSET + (start_offset * 100))
        for i in range((end_offset - start_offset) * 100):
            f.write(b'\0')
    gc.collect()
    app.SESSIONS[session] = Llama(
        model_path=MODEL_PATH.replace(".gguf", f"-{session}.gguf"),
        n_gpu_layers=-1, # Uncomment to use GPU acceleration
        # seed=1337, # Uncomment to set a specific seed
        n_ctx=2048, # Uncomment to increase the context window
    )
    end_time = time.time()
    print(f"Time to apply lesion: {end_time - start_time}")