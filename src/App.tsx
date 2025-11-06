import InscriptionForm from './InscriptionForm';

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <header className="text-center mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent mb-2">
          TFC Inscription
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Club de sports de combat</p>
      </header>

      <main className="w-full max-w-4xl">
        <InscriptionForm />
      </main>
    </div>
  );
}

export default App;
