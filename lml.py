from PIL import Image
import numpy as np
import math
import sys
import random
import re
import os
from bisect import insort


def main():

    file_bytes = open_binary_file(WEIGHTS_PATH)
    weights = lesion(mode=3, params=(12, 10, 2),
                     weights=bytearray(file_bytes[:]))

    with open('output.model', 'wb') as file:
        file.write(weights)

    # create image from weights
    img = Image.frombuffer('RGB', (IMG_WIDTH, IMG_HEIGHT),
                           bytes(weights[WEIGHTS_INDEX[0]:WEIGHTS_INDEX[1]]))
    img.save("./outputs/" + NAME + '.jpg', 'JPEG', quality=70)

    # save html file
    with open(os.path.join("./outputs/" + NAME + ".html",), "w"):
        pass


def lesion(mode, params, weights):
    # every nth byte
    if mode == 1:
        n = params[0]
        for i in range(WEIGHTS_INDEX[0], WEIGHTS_INDEX[1]):
            if i % n == 0:
                weights[i] = 0

    # first nth bytes
    if mode == 2:
        count = 0
        n = params[0]
        pos = (WEIGHTS_LENGTH // n) * params[1]
        mod = params[2]
        for i in range(WEIGHTS_INDEX[0]+pos, WEIGHTS_INDEX[1]):
            try:
                if i % mod == 0:
                    weights[i] = 0
            except:
                print(i)
                exit(1)
            count += 1
            if count > WEIGHTS_LENGTH // n:
                break

    # random n segments of xth size
    if mode == 3:
        for i in range(params[0]):
            start = random.randint(WEIGHTS_INDEX[0], WEIGHTS_INDEX[1])
            end = start + WEIGHTS_LENGTH // params[1]
            for j in range(start, end):
                if j % params[2] == 0:
                    # could be out of bounds but all g
                    try:
                        weights[j] = 0
                    except:
                        continue
    return weights


def open_binary_file(path):
    with open(path, 'rb') as f:
        return f.read()


if __name__ == "__main__":
    args = sys.argv[1:]
    NAME = args[1]
    if args[0] == '7B':
        WEIGHTS_PATH = '/Users/michaellong/School/STS/llama/alpaca.cpp/ggml-alpaca-7b-q4.bin'
        IMG_WIDTH = 4000
        IMG_HEIGHT = 6800
        WEIGHTS_INDEX = [4130807017, 4212727017]
        WEIGHTS_LENGTH = WEIGHTS_INDEX[1]-WEIGHTS_INDEX[0]

        print(IMG_WIDTH*IMG_HEIGHT > WEIGHTS_LENGTH)
        print(IMG_WIDTH*IMG_HEIGHT)
        print(WEIGHTS_LENGTH)
        exit(1)

    elif args[0] == '13B':
        WEIGHTS_PATH = '/Users/michaellong/School/STS/llama/alpaca.cpp/ggml-alpaca-13b-q4.bin'
        IMG_WIDTH = 5000
        IMG_HEIGHT = 6800
        WEIGHTS_INDEX = [8034237097, 8136637097]
        WEIGHTS_LENGTH = WEIGHTS_INDEX[1]-WEIGHTS_INDEX[0]

    main()
