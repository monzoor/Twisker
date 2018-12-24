import React, { Component } from 'react';
import { Editor } from 'slate-react';
import { Value } from 'slate';
import SweetAlert from 'react-bootstrap-sweetalert';
import { withAlert } from 'react-alert';

// eslint-disable-next-line import/no-extraneous-dependencies
import { isKeyHotkey } from 'is-hotkey';
import initialValue from './value.json';
import DEFAULT_NODE from './_config';
import schema from './_schema';
import {
    Button,
    Icon,
    Toolbar,
    Image,
} from './components';


/**
 * Define hotkey matchers.
 *
 * @type {Function}
 */

const isBoldHotkey = isKeyHotkey('mod+b');
const isItalicHotkey = isKeyHotkey('mod+i');
const isUnderlinedHotkey = isKeyHotkey('mod+u');
const isCodeHotkey = isKeyHotkey('mod+`');
const isTabHotkey = isKeyHotkey('tab');
const isShiftTabHotkey = isKeyHotkey('shift+tab');

/**
 * A change function to standardize inserting images.
 *
 * @param {Editor} editor
 * @param {String} src
 * @param {Range} target
 */

const insertImage = (editor, src, target) => {
    if (target) {
        editor.select(target);
    }

    editor.insertBlock({
        type: 'image',
        data: { src },
    });
};

/**
 * Read Data from localstorage or from json file
 */
const storedValue = JSON.parse(localStorage.getItem('data'));
const data = Value.fromJSON(storedValue || initialValue);
const storedNodeLimit = localStorage.getItem('nodeLimit');

class DemoEditor extends Component {
    state = {
        value: data,
        openSettingsMenu: false,
        nodeLimit: storedNodeLimit || 0,
        saveButtonDisabled: false,
        alert: null,
        imageUrl: null,
    }

    componentDidMount() {
        const { nodeLimit } = this.state;
        /**
         * Disable save button on reload if current node excid the node limit
         */
        this.setState({
            saveButtonDisabled: !!(parseInt(nodeLimit, 10) !== 0 && this.blockCounter() > parseInt(nodeLimit, 10)),
        });
    }

    componentDidUpdate(prevProps, prevState) {
        const { imageUrl } = this.state;
        /**
         * Reject url if there is no url
         * Set url from prompt
         * Show image in editor
         *
         */
        if (prevState.imageUrl !== imageUrl) {
            if (!imageUrl) return;
            this.editor.command(insertImage, imageUrl);
        }
    }

    /**
    * Check if the current selection has a mark with `type` in it.
    *
    * @param {String} type
    * @return {Boolean}
    */

    hasMark = (type) => {
        const { value } = this.state;
        return value.activeMarks.some(mark => mark.type === type);
    }

    /**
    * Check if the any of the currently selected blocks are of `type`.
    *
    * @param {String} type
    * @return {Boolean}
    */

    hasBlock = (type) => {
        const { value } = this.state;
        return value.blocks.some(node => node.type === type);
    }

    /**
    * Store a reference to the `editor`.
    *
    * @param {Editor} editor
    */

    ref = (editor) => {
        this.editor = editor;
    }

    /**
    * Render a mark-toggling toolbar button.
    *
    * @param {String} type
    * @param {String} icon
    * @return {Element}
    */

    renderMarkButton = (type, icon) => {
        const isActive = this.hasMark(type);

        return (
            <Button active={isActive} onMouseDown={event => this.onClickMark(event, type)}>
                <Icon>{icon}</Icon>
            </Button>
        );
    }

    /**
    * Render a block-toggling toolbar button.
    *
    * @param {String} type
    * @param {String} icon
    * @return {Element}
    */

    renderBlockButton = (type, icon) => {
        let isActive = this.hasBlock(type);

        if (['numbered-list', 'bulleted-list'].includes(type)) {
            const { value } = this.state;
            const { document, blocks } = value;

            if (blocks.size > 0) {
                const parent = document.getParent(blocks.first().key);
                isActive = this.hasBlock('list-item') && parent && parent.type === type;
            }
        }
        if (['imageBrowser'].includes(type)) {
            return (
                <div className="upload-btn-wrapper">
                    <Button active={isActive}>
                        <Icon>{icon}</Icon>
                        <input type="file" id="input-button" onChange={event => this.onClickBlock(event, type)} />
                    </Button>
                </div>
            );
        }
        return (
            <Button active={isActive} onMouseDown={event => this.onClickBlock(event, type)}>
                <Icon>{icon}</Icon>
            </Button>
        );
    }

    /**
    * Render a Slate node.
    *
    * @param {Object} props
    * @return {Element}
    */

    renderNode = (props, editor, next) => {
        const {
            attributes,
            children,
            node,
            isFocused,
        } = props;

        switch (node.type) {
        case 'block-quote':
            return <blockquote {...attributes}>{children}</blockquote>;
        case 'bulleted-list':
            return <ul {...attributes}>{children}</ul>;
        case 'heading-one':
            return <h1 {...attributes}>{children}</h1>;
        case 'heading-two':
            return <h2 {...attributes}>{children}</h2>;
        case 'list-item':
            return <li {...attributes}>{children}</li>;
        case 'numbered-list':
            return <ol {...attributes}>{children}</ol>;
        case 'image': {
            const src = node.data.get('src');
            return <Image src={src} selected={isFocused} {...attributes} />;
        }
        default:
            return next();
        }
    }

    /**
    * Render a Slate mark.
    *
    * @param {Object} props
    * @return {Element}
    */

    renderMark = (props, editor, next) => {
        const { children, mark, attributes } = props;

        switch (mark.type) {
        case 'bold':
            return <strong {...attributes}>{children}</strong>;
        case 'code':
            return <code {...attributes}>{children}</code>;
        case 'italic':
            return <em {...attributes}>{children}</em>;
        case 'underlined':
            return <u {...attributes}>{children}</u>;
        default:
            return next();
        }
    }

    /**
    * On change, save the new `value`.
    * Set save button disabled status
    *
    * @param {Object} value
    */

    onChange = ({ value }) => {
        const { nodeLimit } = this.state;
        this.setState({
            saveButtonDisabled: !!(parseInt(nodeLimit, 10) !== 0 && this.blockCounter() > parseInt(nodeLimit, 10)),
            value,
        });
    }

    /**
     * On key down, if it's a formatting command toggle a mark.
     *
     * @param {Event} event
     * @param {Editor} editor
     * @return {Change}
     */

    // eslint-disable-next-line consistent-return
    onKeyDown = (event, editor, next) => {
        let mark;

        const { value } = editor;
        const { document } = value;

        const block = value.blocks.first();
        const parent = block ? document.getParent(block.key) : null;

        if (isTabHotkey(event)) {
            const previousSibling = document.getPreviousSibling(block.key);
            const type = !parent.type ? 'bulleted-list' : parent.type;
            mark = type;

            // If no previous sibling exists, return
            if (!previousSibling) {
                event.preventDefault();
                return next();
            }

            // check whether it's already in 3rd level
            const depth = document.getDepth(block.key);
            if (depth > 3) {
                event.preventDefault();
                return next();
            }

            if (parent) {
                editor.setBlocks('list-item').wrapBlock(type);
            }
        } else if (isShiftTabHotkey(event)) {
            const type = !parent.type ? 'bulleted-list' : parent.type;
            mark = type;

            // if multi level list items are selected for shift+tab, then return
            const firstBlockDepth = block && document.getDepth(block.key);
            let multiLevelSelected = false;
            value.blocks.map((currentKey) => {
                const currentDepth = document.getDepth(currentKey.key);
                multiLevelSelected = !!(firstBlockDepth !== currentDepth);
                return true;
            });
            if (multiLevelSelected) return next();

            // if first level list-items selected then, make paragraph
            if (parent && typeof parent.type === 'undefined') {
                editor
                    .setBlocks(DEFAULT_NODE)
                    .unwrapBlock('bulleted-list')
                    .unwrapBlock('numbered-list');
                return next();
            }

            const isActive = this.hasBlock('list-item') && block && (parent.type === 'numbered-list' || parent.type === 'bulleted-list');

            if (isActive) {
                editor
                    .setBlocks('list-item')
                    .unwrapBlock('bulleted-list')
                    .unwrapBlock('numbered-list');
            } else {
                editor
                    .setBlocks(DEFAULT_NODE)
                    .unwrapBlock('bulleted-list')
                    .unwrapBlock('numbered-list');
            }
        } else if (isBoldHotkey(event)) {
            mark = 'bold';
        } else if (isItalicHotkey(event)) {
            mark = 'italic';
        } else if (isUnderlinedHotkey(event)) {
            mark = 'underlined';
        } else if (isCodeHotkey(event)) {
            mark = 'code';
        } else {
            return next();
        }

        event.preventDefault();
        editor.toggleMark(mark);
    }

    /**
     * When a mark button is clicked, toggle the current mark.
     *
     * @param {Event} event
     * @param {String} type
     */

    onClickMark = (event, type) => {
        event.preventDefault();
        this.editor.toggleMark(type);
    }

    /**
     * Image URl prompt
     *
     */
    getImageUrlPrompt = () => {
        const hideAlert = () => {
            this.setState({
                alert: null,
            });
        };
        const getAlert = () => (
            <SweetAlert
              input
              showCancel
              cancelBtnBsStyle="default"
              confirmBtnBsStyle="success"
              title="Pleae enter image url"
              placeHolder="Enter image url"
              onConfirm={(value) => {
                    this.setState({
                        imageUrl: value,
                    });
                    hideAlert();
                }}
              onCancel={() => hideAlert()}
                >
                &nbsp;
            </SweetAlert>
        );

        this.setState({
            alert: getAlert(),
        });
    }

    /**
     * When a block button is clicked, toggle the block type.
     *
     * @param {Event} event
     * @param {String} type
     */

    onClickBlock = (event, type) => {
        event.preventDefault();

        const { editor } = this;
        const { value } = editor;
        const { document } = value;
        const { alert } = this.props;

        if (['image'].includes(type)) {
            // Show URl prompt
            this.getImageUrlPrompt();
        }

        if (['imageBrowser'].includes(type)) {
            /**
             * Convert image in base64
             * Validate Image type
             *
             * @param {File} file
             */
            const getBase64 = file => new Promise((resolve, reject) => {
                const reader = new FileReader();
                if (file.type !== 'image/jpeg') {
                    alert.error('Only JPEG file');
                    return;
                }
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
            getBase64(event.currentTarget.files[0])
                .then((imageData) => {
                    // Show image in editor
                    editor.command(insertImage, imageData);
                });
        }

        // Handle everything but list buttons.
        if (type !== 'bulleted-list' && type !== 'numbered-list') {
            const isActive = this.hasBlock(type);
            const isList = this.hasBlock('list-item');

            if (isList) {
                editor
                    .setBlocks(isActive ? DEFAULT_NODE : type)
                    .unwrapBlock('bulleted-list')
                    .unwrapBlock('numbered-list');
            } else {
                editor.setBlocks(isActive ? DEFAULT_NODE : type);
            }
        } else {
        // Handle the extra wrapping required for list buttons.
            const isList = this.hasBlock('list-item');
            const isType = value.blocks.some(block => !!document.getClosest(block.key, parent => parent.type === type));

            if (isList && isType) {
                editor
                    .setBlocks(DEFAULT_NODE)
                    .unwrapBlock('bulleted-list')
                    .unwrapBlock('numbered-list');
            } else if (isList) {
                editor
                    .unwrapBlock(
                        type === 'bulleted-list' ? 'numbered-list' : 'bulleted-list',
                    )
                    .wrapBlock(type);
            } else {
                editor.setBlocks('list-item').wrapBlock(type);
            }
        }
    }

    /**
     * Show node limit set box
     *
     */
    openSettingsTrigger = () => {
        this.setState(prevState => ({
            openSettingsMenu: !prevState.openSettingsMenu,
        }));
    }

    /**
     * Set node limit value
     * Set save button disabled status
     * @param {Event} event
     */
    setNodeLimit = (e) => {
        e.preventDefault();
        const { value } = e.target;
        this.setState({
            nodeLimit: value,
            saveButtonDisabled: !!(parseInt(value, 10) !== 0 && this.blockCounter() > parseInt(value, 10)),
        });
    };

    /**
     * Set node limit in localstorage
     *
     */
    saveNodeLimit = () => {
        const { nodeLimit } = this.state;
        localStorage.setItem('nodeLimit', nodeLimit);
    }

    /**
     * Get current node size
     *
     * @return  {number}  current node size
     */
    blockCounter = () => {
        const { editor } = this;
        const { value } = editor;
        return value.document.getBlocks().size;
    }

    /**
     * Set current editor data in localstorage
     *
     */
    saveData = () => {
        const { value } = this.state;
        const currentData = JSON.stringify(value.toJSON());
        localStorage.setItem('data', currentData);
    }

    /**
    * Render.
    *
    * @return {Element}
    */

    render() {
        const {
            value,
            openSettingsMenu,
            nodeLimit,
            saveButtonDisabled,
            alert,
        } = this.state;

        return (
            <div>
                <Toolbar>
                    {this.renderMarkButton('bold', 'format_bold')}
                    {this.renderMarkButton('italic', 'format_italic')}
                    {this.renderMarkButton('underlined', 'format_underlined')}
                    {this.renderMarkButton('code', 'code')}
                    {this.renderBlockButton('heading-one', 'looks_one')}
                    {this.renderBlockButton('heading-two', 'looks_two')}
                    {this.renderBlockButton('block-quote', 'format_quote')}
                    {this.renderBlockButton('numbered-list', 'format_list_numbered')}
                    {this.renderBlockButton('bulleted-list', 'format_list_bulleted')}
                    {this.renderBlockButton('image', 'image')}
                    {this.renderBlockButton('imageBrowser', 'cloud_upload')}
                    <div className="float-right">
                        <div className="dropdown">
                            <button onClick={this.openSettingsTrigger} className="btn btn-sm" type="button">
                                <Icon className="text-success">settings</Icon>
                            </button>
                            <div className={`dropdown-menu dropdown-menu-right ${openSettingsMenu ? 'd-block' : 'd-none'}`}>
                                <div className="dropdown-item px-3">
                                    <div className="form-group mb-2">
                                        <label className="small text-muted mb-0" htmlFor="lineLimit">
                                            Node limit (Keep 0 if there is no limit)
                                            <input type="number" value={nodeLimit} name="lineLimit" onChange={this.setNodeLimit} className="form-control mt-2" id="lineLimit" placeholder="Enter number" />
                                        </label>
                                    </div>
                                </div>
                                <div className="dropdown-item px-3">
                                    <button onClick={this.saveNodeLimit} type="button" className="btn btn-sm btn-success float-right ml-2">Save</button>
                                    <button onClick={this.openSettingsTrigger} type="button" className="btn btn-sm btn-light float-right">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>

                </Toolbar>
                <Editor
                  spellCheck
                  autoFocus
                  placeholder="Enter some rich text..."
                  ref={this.ref}
                  value={value}
                  onChange={this.onChange}
                  onKeyDown={this.onKeyDown}
                  renderNode={this.renderNode}
                  renderMark={this.renderMark}
                  schema={schema}
                />
                <hr />
                <button onClick={this.saveData} disabled={`${saveButtonDisabled ? 'disabled' : ''}`} type="button" className="btn btn-success float-right ml-2">Save</button>
                <button type="button" className="btn btn-danger float-right">Cancel</button>
                {alert}
            </div>
        );
    }
}

export default withAlert(DemoEditor);
