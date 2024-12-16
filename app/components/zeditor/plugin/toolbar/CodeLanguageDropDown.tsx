import { CODE_LANGUAGE_FRIENDLY_NAME_MAP } from '@lexical/code';
import { Select } from 'antd';
import { lazy, Suspense } from 'react';

const Divider = lazy(() => import('./ToolbarPlugin').then(module => ({ default: module.Divider })));

const options = Object.entries(CODE_LANGUAGE_FRIENDLY_NAME_MAP).map(([value, label]) => ({ label, value }));

export const CodeLanguageDropDown = ({ language, onChange }: { language: string, onChange: (value: string) => void; }) => {
  return <Suspense>
    <Select un-min-w='30' options={options} value={language} onChange={onChange} />
    <Divider />
  </Suspense>;
};