
import React from 'react';

const Loader: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-800/50 rounded-lg">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-teal-400"></div>
      <p className="mt-4 text-lg text-gray-300">{message}</p>
      <p className="mt-2 text-sm text-gray-400">This may take a few minutes for longer videos.</p>
    </div>
  );
};

export default Loader;
