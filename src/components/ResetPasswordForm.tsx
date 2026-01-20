import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  newPassword: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben."),
});

type FormData = z.infer<typeof formSchema>;

interface ResetPasswordFormProps {
  onSubmit: (password: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const ResetPasswordForm = ({ onSubmit, onCancel, isLoading }: ResetPasswordFormProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: "",
    },
  });

  const handleValidSubmit = (data: FormData) => {
    onSubmit(data.newPassword);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleValidSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Neues Passwort</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Mindestens 8 Zeichen" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>Abbrechen</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Zurücksetzen..." : "Passwort zurücksetzen"}
          </Button>
        </div>
      </form>
    </Form>
  );
};