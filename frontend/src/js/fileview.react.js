var React = require("react");
var ReactRouter = require("react-router");
var Reflux = require("reflux");
var $ = require("jquery");
var _ = require("lodash");
require("./canvas-toBlob");
var DocumentTitle = require("react-document-title");
/* polyfill */
var ReactBootstrap = require("react-bootstrap");


var ChatBox = require("./ChatBox.react");
var settings = require("./settings");
var ModalProgress = require("./components.react").ModalProgress;
var FileContentView = require("./filecontents.react");
var CrawlerView = require("./crawlerview.react");
var CursorView = require("./cursorview.react");
var HexView = require("./hexview.react");
var InfoPane = require("./infopane.react");
var Menu = require("./menu.react");
var viewstore = require("./stores/view");
var Legend = require("./legend.react");
var components = require("./components.react");
var dt = require("./datastructures");
var utils = require("./utils");



module.exports = React.createClass({
    mixins: [
        ReactRouter.Navigation,
        Reflux.listenTo(viewstore.store, "_onChange"),
        components.MediaMixin
    ],
    contextTypes: {
        save_file: React.PropTypes.func,
        router: React.PropTypes.object
    },
    getInitialState: function() {
        return {
            view: viewstore.store.get_data(),
            progress: 0, 
            isSettingup: true,
            session: null
        };
    },
    _onChange: function(){
        this.setState({
            view: viewstore.store.get_data()
        });
    },
    load_file: function () {
        self = this;
        const data = new Uint8Array(49128980).map(() => Math.floor(Math.random() * 256));
        viewstore.actions.load.trigger(
            true,
            "file.name",
            data
        );
    },
    setup_session: function(){
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "http://localhost:8000/api/setup", true);
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.onload = () => {
            if (xhr.status === 200) {
                this.setState({ progress: 75 });
                console.log(xhr.responseText);
                var res = xhr.responseText = JSON.parse(xhr.responseText);
                this.setState({ session: res["session_id"] });
                this.setState({ progress: 100 });
                this.load_file();
                this._prepColorscheme();
                window.addEventListener("resize", this.handleResize);
                return res["session_id"];
            } else {
                return null;
            }
        };
        xhr.send();
    },
    current_colorscheme: function(){
        for (var i in this.state.view.colorschemes){
            if (this.state.view.colorschemes[i].name == this.state.view.colorscheme){
                return this.state.view.colorschemes[i];
            }
        }
    },
    _prepColorscheme: function(){
        var cs = this.current_colorscheme();
        var self = this;
        if (cs.prepare && !cs.prepared && !cs.preparing) {
            cs.prepare(
                self.state.view.data_bytes,
                function(v){
                    self.setState({progress: v});
                },
                function(){
                    self.forceUpdate();
                }
            );
        }
    },
    handleResize: function(){
        this.forceUpdate();
    },
    componentWillMount: function(){
        var n = this.props.params.splat;
        if (n !== "local" && n !== this.state.view.name){
            viewstore.actions.clear();
            // FIXME: This is really funky, and seems like a race that will
            // come back to bite us...
            this.setState({
                view: {}
            });
        }
    },
    sleep: function(time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    },
    componentDidMount: function(){
        var n = this.props.params.splat;
        this.setup_session()
    },
    componentWillUnmount: function(){
        window.removeEventListener("resize", this.handleResize);
    },
    componentDidUpdate: function(){
        if (this.state.view.data){
            this._prepColorscheme();
        }
    },
    render_fileview: function () {
        var cs = this.current_colorscheme();
        content = <div className="scrollbox">
            {/* <HexView
                focus={this.state.view.focus}
                cursor={this.state.view.cursor}
                data_bytes={this.state.view.data_bytes}
                view={this.state.view.view}
                focus_block_len={this.state.view.focus_block_len}
                focus_blocks={this.state.view.focus_blocks}
                hexview_byte_menu={this.state.view.hexview_byte_menu}
                offset_decimal={this.state.view.offset_decimal}
            ></HexView> */}
            <div className="sizebox">
                <FileContentView
                    curvename={this.state.view.curvename}
                    colorscheme={cs}
                    view={this.state.view.view}
                    data_bytes={this.state.view.data_bytes}
                ></FileContentView>
                <CrawlerView
                    focus={this.state.view.focus}
                    curvename={this.state.view.curvename}
                    crawler_pinned={this.state.view.crawler_pinned}
                    view={this.state.view.view}
                    focus_length={viewstore.focus_length(this.state.view)}
                    session={this.state.session}
                ></CrawlerView>
                <CursorView
                    view={this.state.view.view}
                    cursor={this.state.view.cursor}
                    curvename={this.state.view.curvename}
                ></CursorView>
            </div>
        </div>;
        var cls = "fileview " + this.state.media;
        return <div className={cls}>
                {/* <div className="static-modal">
                    <ReactBootstrap.Modal.Dialog>
                        <ReactBootstrap.Modal.Header>
                            <ReactBootstrap.Modal.Title>ReactBootstrap.Modal title</ReactBootstrap.Modal.Title>
                        </ReactBootstrap.Modal.Header>

                        <ReactBootstrap.Modal.Body>One fine body...</ReactBootstrap.Modal.Body>

                        <ReactBootstrap.Modal.Footer>
                            <ReactBootstrap.Button>Close</ReactBootstrap.Button>
                            <ReactBootstrap.Button bsStyle="primary">Save changes</ReactBootstrap.Button>
                        </ReactBootstrap.Modal.Footer>
                    </ReactBootstrap.Modal.Dialog>
                </div> */}
            <div className="menu">
                <Menu
                    is_zoomed={viewstore.view_is_zoomed(this.state.view)}
                    is_max_zoomed={viewstore.view_is_max_zoomed(this.state.view)}
                    colorscheme={this.state.view.colorscheme}
                    colorschemes={this.state.view.colorschemes}
                    curvename={this.state.view.curvename}
                ></Menu>
            </div>
            <div className="image">
                {content}
            </div>
            {/* <div className="scrollbox"> */}
                <div className="sidebar">    
                    {/* <div className="sidebar-inner"> */}
                        {/* <div className="header">
                            <div className="content"> */}
                                <ChatBox session={this.state.session}></ChatBox>
                            {/* </div> */}
                        {/* </div> */}
                    {/* </div> */}
                {/* </div> */}
            </div>
        </div>;
    },
    render: function () {
        if (this.state.view.data){
            return <DocumentTitle>
                {this.render_fileview()}
            </DocumentTitle>;
        } else {
            return <ModalProgress
                progress={this.state.progress}
                message="Setting up Session"
            ></ModalProgress>;
        }
    }
});
