import { Element, Transforms } from 'slate';
import { ReactEditor, RenderElementProps, useReadOnly, useSlateStatic } from 'slate-react';
import { CodeBlock, CodeBlockType } from '../plugin/code';
import { renderEmbed } from '../plugin/embed';
import { ImageBlock, ImageType } from '../plugin/image';
import { HASH_TAG_TYPE, HashTag, LINK_TYPE, Link } from '../plugin/inline';

const H1 = ({ children, attributes }: RenderElementProps) => {
  return <h1
    un-text='4xl blue-950'
    un-font='bold'
    un-leading='tight'
    {...attributes}>
    {children}
  </h1>;
};

const H2 = ({ children, attributes }: RenderElementProps) => {
  return <h2
    un-text='3xl blue-900'
    un-font='bold'
    un-leading='tight'
    {...attributes}>
    {children}
  </h2>;
};

const H3 = ({ children, attributes }: RenderElementProps) => {
  return <h3
    un-text='2xl blue-800'
    un-font='bold'
    un-leading='tight'
    {...attributes}>
    {children}
  </h3>;
};

const H4 = ({ children, attributes }: RenderElementProps) => {
  return <h4
    un-text='xl blue-700'
    un-font='bold'
    un-leading='tight'
    {...attributes}>
    {children}
  </h4>;
};

const H5 = ({ children, attributes }: RenderElementProps) => {
  return <h5
    un-text='lg blue-600'
    un-font='bold'
    un-leading='tight'
    {...attributes}>
    {children}
  </h5>;
};

const H6 = ({ children, attributes }: RenderElementProps) => {
  return <h6
    un-text='base blue-500'
    un-font='bold'
    un-leading='tight'
    {...attributes}>
    {children}
  </h6>;
};

const Paragraph = ({ children, attributes }: RenderElementProps) => {
  return <p {...attributes} >
    {children}
  </p>;
};

const Blockquote = ({ children, attributes }: RenderElementProps) => {
  return <blockquote
    un-text='gray-700'
    un-border='l-4 gray-400'
    un-p='l-4'
    un-font='italic'
    {...attributes} >
    {children}
  </blockquote>;
};

const CheckListItem = ({ children, element, attributes }: RenderElementProps) => {
  const editor = useSlateStatic();
  const readOnly = useReadOnly();
  const { checked } = element as any;

  return (
    <div
      un-flex='~ items-center'
      {...attributes}
    >
      <input
        un-border='rounded'
        un-h='4'
        un-w='4'
        un-accent='blue-500'
        un-cursor='pointer'
        type="checkbox"
        checked={checked}
        onChange={event => {
          Transforms.setNodes(editor,
            { checked: event.target.checked, } as Partial<Element>,
            { at: ReactEditor.findPath(editor as ReactEditor, element) });
        }}
      />
      <span
        un-flex='1'
        un-m='l-2'
        un-text={`${checked && 'gray-500'}`}
        un-font={`${checked && 'italic'}`}
        un-decoration={`${checked && 'line-through'}`}
        contentEditable={!readOnly}
        suppressContentEditableWarning
      >
        {children}
      </span>
    </div >
  );
};

export const renderElement = (props: RenderElementProps) => {
  switch ((props.element as any).type as string) {
    case 'blockquote':
      return <Blockquote {...props} />;
    case 'h1':
      return <H1 {...props} />;
    case 'h2':
      return <H2 {...props} />;
    case 'h3':
      return <H3 {...props} />;
    case 'h4':
      return <H4 {...props} />;
    case 'h5':
      return <H5 {...props} />;
    case 'h6':
      return <H6 {...props} />;
    case 'check-list-item':
      return <CheckListItem {...props} />;
    case CodeBlockType:
      return <CodeBlock {...props} />;
    case ImageType:
      return <ImageBlock {...props} />;
    case LINK_TYPE:
      return <Link {...props} />;
    case HASH_TAG_TYPE:
      return <HashTag {...props} />;
    case 'p':
      return <Paragraph {...props} />;
  }

  const embed = renderEmbed(props);
  return embed || <Paragraph {...props} />;
};

export const dummyData = [
  {
    type: 'check-list-item',
    checked: true,
    children: [{ text: 'Slide to the left.' }],
  },
  {
    type: 'check-list-item',
    checked: false,
    children: [{ text: 'Criss-cross.' }],
  },
  {
    type: 'check-list-item',
    checked: true,
    children: [{ text: 'Criss-cross!' }],
  },
  {
    type: 'check-list-item',
    checked: false,
    children: [{ text: 'Cha cha real smooth…' }],
  },
  {
    type: 'check-list-item',
    checked: false,
    children: [{ text: "Let's go to work!" }],
  },
  {
    type: 'check-list-item',
    checked: false,
    children: [{ text: "" }],
  },
  {
    type: 'paragraph',
    children: [{ text: 'Try it out for yourself!' }],
  },
  {
    type: 'h1',
    children: [{ text: 'Heading 1 here' }],
  },
  {
    type: 'h2',
    children: [{ text: 'Heading 2 here' }],
  },
  {
    type: 'h3',
    children: [{ text: 'Heading 3 here' }],
  },
  {
    type: 'h4',
    children: [{ text: 'Heading 4 here' }],
  },
  {
    type: 'h5',
    children: [{ text: 'Heading 5 here' }],
  },
  {
    type: 'h6',
    children: [{ text: 'Heading 6 here' }],
  },
  {
    type: 'paragraph',
    children: [{ text: 'A line of text in a paragraph' }],
  },
  {
    type: 'blockquote',
    children: [{ text: 'A line of text in a blockquote' }],
  }
];
