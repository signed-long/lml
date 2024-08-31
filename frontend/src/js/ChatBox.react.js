var React = require("react");
var ReactBootstrap = require("react-bootstrap");
var PureRenderMixin = require("react-addons-pure-render-mixin");
var ChatMessage = require("./ChatMessage.react");


module.exports = React.createClass({
    mixins: [PureRenderMixin],
    propTypes: {
        session: React.PropTypes.string.isRequired
    },
    getInitialState: function () {
        return {
            loading: false,
            chat: [],
            error: null
        };
    },
    toggleSendButton: function() {
        if (this.state.loading) {
            this.setState({ loading: false });
            this.refs.input.getInputDOMNode().placeholder = "Send a message";
        } else {
            this.setState({ loading: true });
            this.refs.input.getInputDOMNode().placeholder = "Loading...";
        }
    },
    onSend: async function() {
        this.toggleSendButton();

        var history = "<history>";
        this.state.chat.map((message, i) => {
            if (message.from == "user") {
                history = history.concat("<query>" + message.content + "</query>");
            } else {
                history = history.concat("<response>" + message.content + "</response>");
            }
        });
        var history = history.concat("</history>");

        chat = this.state.chat.concat({ "from": "user", "content": this.refs.input.getValue() })
        this.setState({ chat: chat });
        this.refs.input.getInputDOMNode().value = "";

        var formatted_prompt = history + "<query>" + chat[chat.length - 1].content + "</query><response>";
        console.log(this.props.session);

        var xhr = new XMLHttpRequest();
        xhr.open("POST", "http://localhost:8000/api/prompt?session=" + this.props.session, true);
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.onload = () => {
            if (xhr.status === 200) {
                console.log(xhr.responseText);
                var res = xhr.responseText = JSON.parse(xhr.responseText);
                var text = res["choices"][0]["text"];
                this.setState({ chat: this.state.chat.concat({ "from": "model", "content": text }) });
            } else {
                this.setState({ chat: this.state.chat.concat({ "from": "error", "content": "Your session has expired, or the context window has been maxed out, please refreash to start a new session" }) });
            }
            this.toggleSendButton();
        };
        xhr.send(JSON.stringify({prompt: formatted_prompt}));

    },
    handleKeyDown: function (e) {
        if (e.key === 'Enter') {
            this.onSend();
        }
    },
    render: function() {
        return <div className="chatbox">
                <div className="chatbox-messages">
                    {this.state.chat.map((message, i) => {
                        return (
                            <div>
                                <div 
                                    bsStyle={`${message.from == "model" ? 'primary' : 'default'}`} 
                                    className={`chat-message ${message.from}-message`}
                                >
                                    {message.content}
                                </div>
                            </div>
                        );
                    })}
            </div>
            <div className="chat-input">
                <ReactBootstrap.Input 
                    disabled={this.state.loading} 
                    ref="input" 
                    type="text" 
                    placeholder="Send a message" 
                    onKeyDown={(e) => { e.key === 'Enter' ? this.onSend() : null }} />
                {/* <ReactBootstrap.Button 
                    disabled={this.state.loading} 
                    ref="sendButton" 
                    className="float-right" 
                    type="submit" 
                    onClick={this.onSend} >
                        Send
                </ReactBootstrap.Button> */}
            </div>
        </div>;
    }
});