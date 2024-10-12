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

// Set the caret for the PlainTextEditable (at the relevant ref) if it's not
// already inside it. Defaults to putting the caret at the end, but optionally
// takes an offset.
export function setCaret(ref: React.RefObject<HTMLElement | null>, offset?: number) {
  if (ref.current === null) {
    return;
  }
  const sel = document.getSelection();
  const currentRange = sel?.getRangeAt(0);
  if (sel === null || currentRange === undefined ||
      ref.current.contains(currentRange.startContainer) ||
      ref.current.contains(currentRange.endContainer)) {
    return;
  }
  const range = document.createRange();
  const first = ref.current.childNodes.item(0);
  if (first) {
    range.setStart(
      first, offset !== undefined ? offset : first.textContent?.length || 0);
  }  else {
    range.setStart(ref.current, 0);
  }
  range.collapse(true);
  sel.removeAllRanges();
  // TODO: this feels incredibly stupid.
  setTimeout(() => sel.addRange(range));
}

// TODO: Just rewrite my own contexteditable component and avoid the weird
// brittle assumptions and workarounds about carets and selections and stale
// closures and timeouts and empty text nodes.
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
