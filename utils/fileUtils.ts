
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // The result is in the format "data:[mime-type];base64,..."
      // We need to extract just the base64 part.
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      if (base64String) {
        resolve(base64String);
      } else {
        reject(new Error("Failed to read file as base64. The result was empty."));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};
