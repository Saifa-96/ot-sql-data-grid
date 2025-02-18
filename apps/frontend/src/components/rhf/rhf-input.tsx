import { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';

interface RHFInputProps extends React.ComponentProps<"input"> {
    label: string;
    name: string;
    desc?: string;
}

export const RHFInput: FC<RHFInputProps> = (props) => {
    const { label, name, desc } = props;
    const { control } = useFormContext();
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <Input autoComplete='off' {...field} />
                    </FormControl>
                    {desc && <FormDescription>{desc}</FormDescription>}
                    <FormMessage />
                </FormItem>
            )}
        />
    )
};