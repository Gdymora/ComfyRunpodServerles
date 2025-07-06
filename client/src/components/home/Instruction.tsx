// src/components/home/Instruction.tsx - For 3D Generation

export const Instruction: React.FC = () => {
  const steps = [
    {
      id: 1,
      icon: "📸",
      title: "Загрузите фото",
      description: "Выберите четкое изображение с хорошим освещением"
    },
    {
      id: 2,
      icon: "🤖",
      title: "ИИ анализирует",
      description: "Алгоритм создает глубинную карту и определяет объем"
    },
    {
      id: 3,
      icon: "🎭",
      title: "Получите 3D модель",
      description: "Скачайте GLB файл для использования в любых программах"
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      <h3 className="text-2xl text-white text-center mb-8 font-light">
        Как это работает
      </h3>
      
      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step, index) => (
          <div key={step.id} className="text-center">
            <div className="relative mb-4">
              {/* Иконка шага */}
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-600/30 to-blue-600/30 
                            rounded-full flex items-center justify-center text-4xl backdrop-blur-sm
                            border border-white/10">
                {step.icon}
              </div>
              
              {/* Номер шага */}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-purple-600 rounded-full 
                            flex items-center justify-center text-white text-sm font-bold">
                {step.id}
              </div>
              
              {/* Стрелка к следующему шагу */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 left-full w-8 text-center text-white/30">
                  →
                </div>
              )}
            </div>
            
            <h4 className="text-white font-medium text-lg mb-2">
              {step.title}
            </h4>
            
            <p className="text-white/70 text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
      
      {/* Дополнительная информация */}
      <div className="mt-12 grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <h5 className="text-white font-medium mb-2 flex items-center">
            <span className="text-green-400 mr-2">✓</span>
            Поддерживаемые форматы
          </h5>
          <p className="text-white/70 text-sm">
            JPG, PNG, WEBP • Минимальный размер: 512x512px
          </p>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <h5 className="text-white font-medium mb-2 flex items-center">
            <span className="text-blue-400 mr-2">ℹ</span>
            Время обработки
          </h5>
          <p className="text-white/70 text-sm">
            1-2 минуты в зависимости от сложности изображения
          </p>
        </div>
      </div>
      
      {/* Советы для лучшего результата */}
      <div className="mt-8 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-lg p-6 border border-purple-500/20">
        <h5 className="text-white font-medium mb-4 text-center">
          Советы для лучшего результата
        </h5>
        
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span className="text-white/80">Хорошее освещение без теней</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span className="text-white/80">Четкий фокус на объекте</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span className="text-white/80">Контрастный фон</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <span className="text-red-400 mt-0.5">×</span>
              <span className="text-white/80">Размытые или темные фото</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-red-400 mt-0.5">×</span>
              <span className="text-white/80">Слишком сложные сцены</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-red-400 mt-0.5">×</span>
              <span className="text-white/80">Объекты с прозрачностью</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};