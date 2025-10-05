import { VideoChunk, VideoMetadata, QualityLevel } from '@/types/streaming';

export class VideoChunker {
  private file: File;
  private chunkSize: number;
  private chunks: VideoChunk[] = [];
  private metadata: VideoMetadata;
  private qualityLevels: QualityLevel[];

  constructor(file: File, chunkSize: number = 64 * 1024) {
    this.file = file;
    this.chunkSize = chunkSize;
    this.qualityLevels = [
      { name: 'low', chunkSize: 32 * 1024, maxBandwidth: 1 * 1024 * 1024, description: 'Low quality, fast streaming' },
      { name: 'medium', chunkSize: 64 * 1024, maxBandwidth: 5 * 1024 * 1024, description: 'Balanced quality and speed' },
      { name: 'high', chunkSize: 128 * 1024, maxBandwidth: 10 * 1024 * 1024, description: 'High quality, requires good connection' }
    ];
    this.metadata = {
      fileName: file.name,
      fileSize: file.size,
      duration: 0, // Will be set after video loads
      mimeType: file.type,
      totalChunks: 0,
      checksum: ''
    };
  }

  async createChunks(quality: string = 'medium'): Promise<VideoChunk[]> {
    const qualityLevel = this.qualityLevels.find(q => q.name === quality) || this.qualityLevels[1];
    this.chunkSize = qualityLevel.chunkSize;
    
    console.log(`Creating video chunks with quality: ${quality}, chunk size: ${this.chunkSize} bytes`);
    
    const chunks: VideoChunk[] = [];
    const totalChunks = Math.ceil(this.file.size / this.chunkSize);
    
    this.metadata.totalChunks = totalChunks;
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, this.file.size);
      const chunkData = await this.readFileChunk(start, end);
      const checksum = await this.calculateChecksum(chunkData);
      
      const chunk: VideoChunk = {
        index: i,
        data: chunkData,
        timestamp: Date.now(),
        isLast: i === totalChunks - 1,
        size: chunkData.byteLength,
        checksum
      };
      
      chunks.push(chunk);
      
      // Yield control to prevent blocking
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    this.chunks = chunks;
    this.metadata.checksum = await this.calculateFileChecksum();
    
    console.log(`Created ${chunks.length} chunks for video: ${this.file.name}`);
    return chunks;
  }

  async getChunk(index: number): Promise<VideoChunk | null> {
    if (index < 0 || index >= this.chunks.length) {
      return null;
    }
    return this.chunks[index];
  }

  async getChunkRange(startIndex: number, endIndex: number): Promise<VideoChunk[]> {
    const chunks: VideoChunk[] = [];
    for (let i = startIndex; i <= endIndex && i < this.chunks.length; i++) {
      const chunk = await this.getChunk(i);
      if (chunk) {
        chunks.push(chunk);
      }
    }
    return chunks;
  }

  getTotalChunks(): number {
    return this.chunks.length;
  }

  getChunkSize(): number {
    return this.chunkSize;
  }

  getMetadata(): VideoMetadata {
    return { ...this.metadata };
  }

  getQualityLevels(): QualityLevel[] {
    return [...this.qualityLevels];
  }

  async getVideoDuration(): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        this.metadata.duration = video.duration;
        resolve(video.duration);
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => {
        console.warn('Could not load video metadata, using default duration');
        resolve(0);
        URL.revokeObjectURL(video.src);
      };
      
      video.src = URL.createObjectURL(this.file);
    });
  }

  private async readFileChunk(start: number, end: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer);
      };
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file chunk from ${start} to ${end}`));
      };
      
      const blob = this.file.slice(start, end);
      reader.readAsArrayBuffer(blob);
    });
  }

  private async calculateChecksum(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async calculateFileChecksum(): Promise<string> {
    const fileBuffer = await this.readFileChunk(0, this.file.size);
    return this.calculateChecksum(fileBuffer);
  }

  // Clean up resources
  destroy(): void {
    this.chunks = [];
    this.metadata = {
      fileName: '',
      fileSize: 0,
      duration: 0,
      mimeType: '',
      totalChunks: 0,
      checksum: ''
    };
  }
}
