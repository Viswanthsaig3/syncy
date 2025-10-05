'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileVideo, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { isValidVideoFile, createVideoUrl, formatFileSize } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface FileSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FileSelector: React.FC<FileSelectorProps> = ({ isOpen, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { setVideoFile, setVideoUrl, videoUrl } = useAppStore();

  const handleFileSelect = (file: File) => {
    if (!isValidVideoFile(file)) {
      toast.error('Please select a valid video file (MP4, WebM, OGG, AVI, MOV, WMV, FLV, MKV)');
      return;
    }

    // Revoke previous URL if exists
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    setSelectedFile(file);
    setVideoFile(file);
    
    const newVideoUrl = createVideoUrl(file);
    setVideoUrl(newVideoUrl);
    
    toast.success('Video file selected successfully!');
    onClose();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleRemoveFile = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setSelectedFile(null);
    setVideoFile(null);
    setVideoUrl(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <FileVideo className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Select Video File</h2>
            <p className="text-sm text-gray-500">Choose a local video file to watch</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* File Drop Zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
              dragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400',
              selectedFile && 'border-green-500 bg-green-50'
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={openFileDialog}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-3">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {dragActive ? 'Drop your video here' : 'Select or drop a video file'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports MP4, WebM, OGG, AVI, MOV, WMV, FLV, MKV
                  </p>
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  <Upload className="w-4 h-4" />
                  Choose File
                </button>
              </div>
            )}
          </div>

          {/* File Info */}
          {selectedFile && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">File Information</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span className="font-mono">{selectedFile.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span>{formatFileSize(selectedFile.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span>{selectedFile.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Modified:</span>
                  <span>{new Date(selectedFile.lastModified).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Important Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 mb-1">Important:</p>
                <ul className="text-yellow-700 space-y-1">
                  <li>• All participants must have the same video file</li>
                  <li>• The video file stays on your device (not uploaded)</li>
                  <li>• Only playback controls are synchronized</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {selectedFile && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Continue
              </button>
            )}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
