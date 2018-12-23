import React, { Component } from 'react';
import { Editor } from 'slate-react';
import { Value } from 'slate';
// eslint-disable-next-line import/no-extraneous-dependencies
import { isKeyHotkey } from 'is-hotkey';
import styled from '@emotion/styled';

import initialValue from './value.json';
import { Button, Icon, Toolbar } from './components';

const Image = styled('img')`
  display: block;
  max-width: 100%;
  max-height: 20em;
  box-shadow: ${props => (props.selected ? '0 0 0 2px blue;' : 'none')};
`;

const schema = {
    blocks: {
        image: {
            isVoid: true,
        },
    },
};
/**
 * Define the default node type.
 *
 * @type {String}
 */

const DEFAULT_NODE = 'paragraph';

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

class RichTextExample extends Component {
    state = {
        value: Value.fromJSON(initialValue),
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
            const { value: { document, blocks } } = this.state;

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
     *
     * @param {Editor} editor
     */

    onChange = ({ value }) => {
        this.setState({ value });
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
                const depth = document.getDepth(currentKey.key);
                multiLevelSelected = !!(firstBlockDepth !== depth);
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

        if (['image'].includes(type)) {
            const src = window.prompt('Enter the URL of the image:');
            if (!src) return;
            this.editor.command(insertImage, src);
        }

        if (['imageBrowser'].includes(type)) {
            const getBase64 = file => new Promise((resolve, reject) => {
                const reader = new FileReader();
                if (file.type !== 'image/jpeg') {
                    alert('Wrong File! Only JPG.');
                    return;
                }
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
            getBase64(event.currentTarget.files[0]).then(
                (data) => {
                    this.editor.command(insertImage, data);
                },
            );
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
   * Render.
   *
   * @return {Element}
   */

    render() {
        const { value } = this.state;
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
            </div>
        );
    }
}

export default RichTextExample;
