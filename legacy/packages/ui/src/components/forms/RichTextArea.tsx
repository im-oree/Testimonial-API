/** RichTextArea — Doc 4 §6 / Doc 5 §5.5 forms (forms) · styled per §5 spec. */
import type { TextareaHTMLAttributes } from 'react';

export function RichTextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea data-component="RichTextArea" placeholder="Write content…" {...props} />;
}
