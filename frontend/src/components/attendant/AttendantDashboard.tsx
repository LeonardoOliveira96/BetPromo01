import { UserSearch } from './UserSearch';

export const AttendantDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard do Atendente</h1>
        <p className="text-muted-foreground">
          Busque usuários e gerencie suas promoções
        </p>
      </div>

      <UserSearch />
    </div>
  );
};