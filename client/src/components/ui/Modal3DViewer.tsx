// src/components/ui/Modal3DViewer.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

interface Modal3DViewerProps {
  isOpen: boolean;
  onClose: () => void;
  modelUrl: string;
  filename: string;
}

export const Modal3DViewer: React.FC<Modal3DViewerProps> = ({
  isOpen,
  onClose,
  modelUrl,
  filename
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Налаштування рендерера
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x1a1024, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Налаштування сцени
    scene.background = new THREE.Color(0x1a1024);
    
    // Освітлення
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 0.6);
    pointLight1.position.set(-5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x8b5cf6, 0.4);
    pointLight2.position.set(5, -5, -5);
    scene.add(pointLight2);

    // Завантаження моделі
    const loadModel = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Перевіряємо тип файлу
        if (filename.toLowerCase().endsWith('.glb') || filename.toLowerCase().endsWith('.gltf')) {
          // Завантаження GLB/GLTF файлів
          const loader = new GLTFLoader();
          
          const gltf = await new Promise<any>((resolve, reject) => {
            loader.load(
              modelUrl,
              (loadedGltf) => resolve(loadedGltf),
              (progress) => {
                console.log('Loading progress:', progress);
              },
              (error) => {
                console.error('Loading error:', error);
                reject(error);
              }
            );
          });
          
          const model = gltf.scene;
          
          // Налаштування матеріалів і тіней
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              
              // Покращення матеріалів
              if (child.material) {
                child.material.needsUpdate = true;
                if (child.material.map) {
                  child.material.map.flipY = false;
                }
              }
            }
          });
          
          scene.add(model);
          modelRef.current = model;
          
          // Автоматичне масштабування і центрування
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          // Центруємо модель
          model.position.sub(center);
          
          // Масштабуємо модель щоб вона поміщалася в кадр
          const maxSize = Math.max(size.x, size.y, size.z);
          const scale = 3 / maxSize; // Масштаб для зручного перегляду
          model.scale.multiplyScalar(scale);
          
          // Позиціонування камери
          const distance = maxSize * 1.5;
          camera.position.set(distance, distance * 0.5, distance);
          camera.lookAt(0, 0, 0);
          
        } else {
          // Для зображень створюємо площину
          const textureLoader = new THREE.TextureLoader();
          const texture = await new Promise<THREE.Texture>((resolve, reject) => {
            textureLoader.load(modelUrl, resolve, undefined, reject);
          });
          
          const geometry = new THREE.PlaneGeometry(4, 4);
          const material = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
          });
          const plane = new THREE.Mesh(geometry, material);
          
          scene.add(plane);
          modelRef.current = plane;
          
          // Позиціонування камери для зображення
          camera.position.set(0, 0, 6);
          camera.lookAt(0, 0, 0);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Помилка завантаження моделі:', err);
        setError('Не вдалося завантажити модель. Перевірте формат файлу.');
        setIsLoading(false);
      }
    };

    loadModel();

    // Анімація
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Обробка зміни розміру
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);

    // Керування мишею
    let isMouseDown = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handleMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = () => {
      isMouseDown = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isMouseDown || !modelRef.current) return;

      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
      };

      const rotationSpeed = 0.005;
      modelRef.current.rotation.y += deltaMove.x * rotationSpeed;
      modelRef.current.rotation.x += deltaMove.y * rotationSpeed;

      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    // Масштабування
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomSpeed = 0.1;
      const zoomFactor = 1 + (event.deltaY > 0 ? zoomSpeed : -zoomSpeed);
      camera.position.multiplyScalar(zoomFactor);
      
      // Обмежуємо мінімальну і максимальну відстань
      const distance = camera.position.length();
      if (distance < 1) {
        camera.position.normalize().multiplyScalar(1);
      } else if (distance > 50) {
        camera.position.normalize().multiplyScalar(50);
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Очищення
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('wheel', handleWheel);
      
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      
      // Очищення ресурсів Three.js
      if (modelRef.current) {
        scene.remove(modelRef.current);
      }
      
      renderer.dispose();
      
      // Очищення геометрії та матеріалів
      scene.traverse((object: any) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material: any) => {
              if (material.map) material.map.dispose();
              material.dispose();
            });
          } else {
            if (object.material.map) object.material.map.dispose();
            object.material.dispose();
          }
        }
      });
    };
  }, [isOpen, modelUrl, filename]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Animated background glow */}
        <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl opacity-20 blur-xl animate-pulse"></div>
        
        {/* Main modal container */}
        <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 flex flex-col h-full overflow-hidden">
          {/* Header with glassmorphism */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                3D Viewer
              </h3>
              <p className="text-gray-300 text-sm mt-1">{filename}</p>
            </div>
            <button
              onClick={onClose}
              className="group relative w-12 h-12 bg-red-500/20 hover:bg-red-500/40 rounded-2xl border border-red-300/20 transition-all duration-300 hover:scale-110"
            >
              <span className="text-red-300 group-hover:text-white text-xl font-light">×</span>
            </button>
          </div>

          {/* 3D Viewer Content */}
          <div className="flex-1 relative bg-gradient-to-br from-gray-900/20 to-gray-800/20">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                  </div>
                  <p className="text-white font-medium">Загрузка модели...</p>
                  <p className="text-gray-400 text-sm mt-1">Подготовка 3D сцены</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                <div className="text-center backdrop-blur-md bg-red-500/10 rounded-2xl p-8 border border-red-500/20">
                  <div className="text-6xl mb-4">🚫</div>
                  <p className="text-red-300 text-lg font-medium mb-4">{error}</p>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:scale-105 transition-transform duration-300"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            )}

            <div 
              ref={containerRef} 
              className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden"
            />
          </div>

          {/* Enhanced Controls Footer */}
          <div className="p-6 border-t border-white/10 bg-white/5">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              {/* Controls info */}
              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-8 text-sm text-gray-300">
                <div className="flex items-center space-x-2">
                  <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-300">🖱️</span>
                  <span>Перетаскивайте для поворота</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-300">🔄</span>
                  <span>Колесико для масштаба</span>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex space-x-3">
                <a
                  href={modelUrl}
                  download={filename}
                  className="group relative px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  <span className="relative z-10 flex items-center space-x-2">
                    <span>📥</span>
                    <span>Скачать</span>
                  </span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></div>
                </a>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};