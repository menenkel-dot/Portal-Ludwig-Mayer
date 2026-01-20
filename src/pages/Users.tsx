import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, createUser, updateUser, resetUserPassword, NewUserPayload, UpdateUserPayload } from "@/services/userService";
import { AppUser } from "@/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, LockKeyhole } from "lucide-react";
import { UserForm } from "@/components/UserForm";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { showSuccess, showError } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const Users = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  };

  const createMutation = useMutation({
    mutationFn: createUser,
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Benutzer erfolgreich erstellt.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    ...mutationOptions,
    onSuccess: () => {
        mutationOptions.onSuccess();
        showSuccess("Benutzer erfolgreich aktualisiert.");
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: () => {
      showSuccess("Passwort erfolgreich zurückgesetzt.");
      setIsPasswordResetOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });

  const handleFormSubmit = (data: any) => {
    const role = data.isAdmin ? 'admin' : 'user';
    const permissions = data.isAdmin ? [] : data.permissions; // Admin role implies all permissions, so we send an empty array or the actual list

    if (selectedUser) {
      const payload: UpdateUserPayload = {
        userId: selectedUser.id,
        permissions: permissions,
        department: data.department,
        role: role,
      };
      updateMutation.mutate(payload);
    } else {
      const payload: NewUserPayload = {
        email: data.email,
        password: data.password,
        permissions: permissions,
        department: data.department,
        role: role,
      };
      createMutation.mutate(payload);
    }
  };

  const handlePasswordResetSubmit = (newPassword: string) => {
    if (selectedUser) {
      resetPasswordMutation.mutate({ userId: selectedUser.id, newPassword });
    }
  };

  const openDialog = (user: AppUser | null) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const openPasswordReset = (user: AppUser) => {
    setSelectedUser(user);
    setIsPasswordResetOpen(true);
  };

  if (isLoading) return <div>Lade Benutzer...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Benutzerverwaltung</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setSelectedUser(null); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog(null)} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Neuer Benutzer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedUser ? "Benutzer bearbeiten" : "Neuen Benutzer anlegen"}</DialogTitle>
            </DialogHeader>
            <UserForm
              onSubmit={handleFormSubmit}
              initialData={selectedUser}
              onCancel={() => setIsDialogOpen(false)}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-Mail</TableHead>
              <TableHead>Abteilung</TableHead>
              <TableHead>Berechtigungen</TableHead>
              <TableHead>Erstellt am</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.app_metadata.department || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.app_metadata.role === 'admin' ? (
                        <Badge>Admin</Badge>
                      ) : (
                        user.app_metadata.permissions?.map(p => <Badge key={p} variant="secondary">{p}</Badge>)
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(user.created_at), "dd.MM.yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDialog(user)}>Bearbeiten</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openPasswordReset(user)}>
                          <LockKeyhole className="mr-2 h-4 w-4" /> Passwort zurücksetzen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Keine Benutzer gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isPasswordResetOpen} onOpenChange={(open) => { if (!open) setSelectedUser(null); setIsPasswordResetOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passwort zurücksetzen für {selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <ResetPasswordForm
            onSubmit={handlePasswordResetSubmit}
            onCancel={() => setIsPasswordResetOpen(false)}
            isLoading={resetPasswordMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;