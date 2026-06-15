async function uint8ToB64(bytes) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes]);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
console.log('Script created');
