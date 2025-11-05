import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <header className="text-center mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent mb-2">
          TFC Inscription
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          React + TypeScript + Vite + Bun + Biome + Tailwind CSS
        </p>
      </header>

      <main className="flex flex-col items-center gap-8">
        <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center">
          <button
            type="button"
            onClick={() => setCount((count) => count + 1)}
            className="px-6 py-3 text-base font-medium text-white bg-purple-600 hover:bg-purple-700 active:translate-y-0.5 rounded-lg transition-all duration-200"
          >
            count is {count}
          </button>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-4">
            Edit src/App.tsx and save to test HMR
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
