var React = require("react");
// import ReactMarkdown from 'react-markdown';
var PureRenderMixin = require("react-addons-pure-render-mixin");
var ReactBootstrap = require("react-bootstrap");


module.exports = React.createClass({
    mixins: [PureRenderMixin],
    render: function() {
        var message = this.props.message;
        if (message.from == "llama") {
            xsOffset = 1;
        } else {
            xsOffset = 0;
        }
        return (
            <div>
                <span className={`chat-message ${message.from == "llama" ? 'bot-message' : 'user-message'}`}>
                    {message.content}
                </span>
                <br></br>
            </div>
        );
    }
});