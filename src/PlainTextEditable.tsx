import { useRef } from 'react';
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable';
import sanitizeHtml from 'sanitize-html';

export interface PlainTextEditableProps {
  // The initial text value.
  initialValue: string
  // The handler for text updates.
  onChange: (event: ContentEditableEvent) => void
  // Optional class name to use.
  className?: string
  // Optional tag name to use (defaults to div).
  tagName?: string
  // Optional ref.
  innerRef?: React.RefObject<HTMLElement>
  // Optional handlers for handling focus and key events.
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void
  onKeyUp?: (event: React.KeyboardEvent<HTMLElement>) => void
}

// TODO: really do the proper ref-wrapping instead.
export function PlainTextEditable(props: PlainTextEditableProps) {
  // You would think this would all be easier with useState, but alas, the
  // library: https://github.com/lovasoa/react-contenteditable/issues/161
  const text = useRef(props.initialValue);
  if (text.current !== props.initialValue) {
    text.current = props.initialValue;
  }

  const handleChange = (e: ContentEditableEvent) => {
    e.target.value = sanitizeHtml(e.target.value, {
      allowedTags: [],
      allowedAttributes: {},
    });
    text.current = e.target.value;
    props.onChange(e);
  };

  return (
    <ContentEditable
      html={text.current}
      onChange={handleChange}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      onKeyDown={props.onKeyDown}
      onKeyUp={props.onKeyUp}
      className={props.className}
      tagName={props.tagName || 'div'}
      innerRef={props.innerRef}
    />
  );
};
