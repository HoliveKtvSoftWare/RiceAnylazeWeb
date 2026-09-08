<template>
  <div class="file-uploader">
    <div class="upload-area" @drop="handleDrop" @dragover.prevent>
      <input
        type="file"
        ref="fileInput"
        @change="handleFileSelect"
        accept=".jpg,.jpeg,.png"
        style="display: none"
      >
      <button @click="$refs.fileInput.click()" class="upload-btn">
        选择文件上传
      </button>
      <p>支持 JPG, PNG 格式</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FileUploader',
  methods: {
    handleFileSelect(event) {
      const file = event.target.files[0]
      if (file) {
        this.$emit('file-selected', file)
      }
    },
    handleDrop(event) {
      event.preventDefault()
      const file = event.dataTransfer.files[0]
      if (file) {
        this.$emit('file-selected', file)
      }
    }
  }
}
</script>

<style scoped>
.upload-area {
  border: 2px dashed #ccc;
  padding: 2rem;
  text-align: center;
  border-radius: 8px;
}

.upload-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 2px;
  cursor: pointer;
}
</style>