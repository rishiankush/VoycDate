import { ChipGroup } from '@/components/ui';

type Groups = Record<string, { label: string; options: readonly string[] }>;

type SingleChoiceGroupsProps<G extends Groups> = {
  groups: G;
  value: Partial<Record<keyof G, string>>;
  onChange: (value: Partial<Record<keyof G, string>>) => void;
};

export function SingleChoiceGroups<G extends Groups>({ groups, value, onChange }: SingleChoiceGroupsProps<G>) {
  return (
    <>
      {(Object.keys(groups) as (keyof G & string)[]).map((key) => (
        <ChipGroup
          key={key}
          label={groups[key].label}
          options={groups[key].options}
          selected={value[key] ? [value[key] as string] : []}
          onChange={(next) => onChange({ ...value, [key]: next[0] })}
        />
      ))}
    </>
  );
}

export function hasAnyAnswer(value: Record<string, string | undefined>) {
  return Object.values(value).some(Boolean);
}
