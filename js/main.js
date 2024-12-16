// 获取DOM元素
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const previewContainer = document.getElementById('previewContainer');
    const compressionControls = document.getElementById('compressionControls');
    const originalImage = document.getElementById('originalImage');
    const compressedImage = document.getElementById('compressedImage');
    const originalSize = document.getElementById('originalSize');
    const compressedSize = document.getElementById('compressedSize');
    const qualitySlider = document.getElementById('qualitySlider');
    const qualityValue = document.getElementById('qualityValue');
    const downloadBtn = document.getElementById('downloadBtn');
    const targetSizeInput = document.getElementById('targetSize');
    const sizeUnit = document.getElementById('sizeUnit');

    let originalFile = null;

    // 上传区域点击事件
    uploadArea.addEventListener('click', () => {
        imageInput.click();
    });

    // 拖拽上传功能
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--primary-color)';
        uploadArea.style.backgroundColor = 'rgba(0, 122, 255, 0.05)';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#DEDEDE';
        uploadArea.style.backgroundColor = 'white';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#DEDEDE';
        uploadArea.style.backgroundColor = 'white';
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        } else {
            alert('请上传PNG或JPG格式的图片文件');
        }
    });

    // 文件选择处理
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        } else {
            alert('请上传PNG或JPG格式的图片文件');
        }
    });

    // 质量滑块变化事件
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = `${e.target.value}%`;
        if (originalFile) {
            compressImage(originalFile, e.target.value / 100);
        }
    });

    // 二分法查找合适的压缩质量
    async function findOptimalQuality(file, targetSize) {
        let left = 0;
        let right = 1;
        let bestQuality = 0;
        let bestBlob = null;
        
        while (right - left > 0.01) {
            const mid = (left + right) / 2;
            const blob = await compressImageToBlob(file, mid);
            
            if (blob.size <= targetSize) {
                bestQuality = mid;
                bestBlob = blob;
                left = mid;
            } else {
                right = mid;
            }
        }
        
        return { quality: bestQuality, blob: bestBlob };
    }

    // 将压缩过程转换为Promise
    function compressImageToBlob(file, quality) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(img.src);
                    resolve(blob);
                }, file.type, quality);
            };
        });
    }

    // 更新压缩处理函数
    async function handleCompression() {
        if (!originalFile) return;

        const targetSizeValue = parseFloat(targetSizeInput.value);
        const unit = sizeUnit.value;
        const targetBytes = targetSizeValue * (unit === 'MB' ? 1024 * 1024 : 1024);

        // 如果原图已经小于目标大小，直接使用原图
        if (originalFile.size <= targetBytes) {
            alert('原图大小已经小于目标大小，无需压缩！');
            return;
        }

        const loadingText = document.createElement('div');
        loadingText.className = 'loading-text';
        loadingText.textContent = '正在压缩...';
        document.body.appendChild(loadingText);

        try {
            const result = await findOptimalQuality(originalFile, targetBytes);
            
            // 更新压缩后的图片预览
            if (compressedImage.src) {
                URL.revokeObjectURL(compressedImage.src);
            }
            compressedImage.src = URL.createObjectURL(result.blob);
            
            // 更新压缩信息
            const compressionRatio = ((originalFile.size - result.blob.size) / originalFile.size * 100).toFixed(1);
            compressedSize.textContent = `${formatFileSize(result.blob.size)} (压缩率: ${compressionRatio}%)`;
            
            // 更新质量滑块
            qualitySlider.value = Math.round(result.quality * 100);
            qualityValue.textContent = `${Math.round(result.quality * 100)}%`;
            
            // 更新下载按钮
            downloadBtn.onclick = () => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(result.blob);
                link.download = `compressed_${originalFile.name}`;
                link.click();
            };
        } catch (error) {
            console.error('压缩过程出错:', error);
            alert('压缩过程出现错误，请重试');
        } finally {
            document.body.removeChild(loadingText);
        }
    }

    // 添加目标大小变化事件监听
    targetSizeInput.addEventListener('change', handleCompression);
    sizeUnit.addEventListener('change', handleCompression);

    // 修改原有的图片上传处理
    function handleImageUpload(file) {
        originalFile = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;
            originalSize.textContent = formatFileSize(file.size);
            previewContainer.style.display = 'grid';
            compressionControls.style.display = 'block';
            
            // 自动进行首次压缩
            handleCompression();
        };
        reader.readAsDataURL(file);
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 添加全局错误处理
    window.addEventListener('error', (e) => {
        console.error('图片处理错误:', e);
        alert('图片处理过程中出现错误，请重试');
    });

    // 改进文件类型检查
    function isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/png'];
        return validTypes.includes(file.type);
    }
}); 
