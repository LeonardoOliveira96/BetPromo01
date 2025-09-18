import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center text-primary-foreground font-bold text-2xl mb-6">
          404
        </div>
        <h1 className="text-4xl font-bold">Página não encontrada</h1>
        <p className="text-xl text-muted-foreground">A página que você procura não existe.</p>
        <a href="/" className="inline-block mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          Voltar ao Início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
