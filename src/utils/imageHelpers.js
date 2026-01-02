export const resizeImage = (file, maxWidth = 500) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const elem = document.createElement('canvas');
                const scaleFactor = maxWidth / img.width;

                // If image is smaller than maxWidth, don't resize
                if (scaleFactor >= 1) {
                    resolve(file);
                    return;
                }

                elem.width = maxWidth;
                elem.height = img.height * scaleFactor;

                const ctx = elem.getContext('2d');
                ctx.drawImage(img, 0, 0, elem.width, elem.height);

                ctx.canvas.toBlob((blob) => {
                    const resizedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(resizedFile);
                }, 'image/jpeg', 0.8);
            };
        };
    });
};
