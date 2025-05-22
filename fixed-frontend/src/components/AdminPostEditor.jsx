import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';
import './adminPostEditor.css'; // create this CSS file as shown below

export default function AdminPostEditor({ content, setContent }) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Image,
            Underline,
            Link.configure({ openOnClick: false }),
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'ProseMirror focus:outline-none',
            },
            handleDrop(_, event) {
                const file = event.dataTransfer?.files?.[0];
                if (!file || !file.type.startsWith('image/')) return false;

                event.preventDefault();

                const formData = new FormData();
                formData.append('image', file);

                fetch('http://localhost:4000/api/upload/image', {
                    method: 'POST',
                    body: formData,
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            const url = `http://localhost:4000${data.url}`;

                            // Use the editor from outer scope, not from view
                            editor
                                ?.chain()
                                .focus()
                                .insertContent([
                                    { type: 'image', attrs: { src: url } },
                                    { type: 'paragraph' },
                                ])
                                .run();
                        }
                    });

                return true;
            },

        },
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && content && editor.getHTML() !== content) {
            editor.commands.setContent(content, false);
        }
    }, [editor, content]);

    useEffect(() => {
        return () => {
            if (editor) editor.destroy();
        };
    }, [editor]);

    if (!editor) return <p>Loading editor...</p>;

    return (
        <div className="tiptap-editor border rounded bg-white p-4">
            <div className="toolbar mb-3 flex gap-2 flex-wrap">
                <button onClick={() => editor.chain().focus().toggleBold().run()} className="btn">Bold</button>
                <button onClick={() => editor.chain().focus().toggleItalic().run()} className="btn">Italic</button>
                <button onClick={() => editor.chain().focus().toggleUnderline().run()} className="btn">Underline</button>
                <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="btn">H2</button>
                <button onClick={() => editor.chain().focus().toggleBulletList().run()} className="btn">• List</button>
                <button onClick={() => editor.chain().focus().setParagraph().run()} className="btn">Text</button>
            </div>

            <EditorContent editor={editor} className="editor-box" />
        </div>
    );
}
