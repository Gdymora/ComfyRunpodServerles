interface InfoItem {
  id: number;
  text: string;
}

export const Info: React.FC = () => {
  const items: InfoItem[] = [
    { id: 1, text: "Как работает 3D генератор?" },
    { id: 2, text: "Какие фото лучше подходят для 3D?" },
    { id: 3, text: "В каких форматах сохраняется модель?" },
    { id: 4, text: "Можно ли редактировать созданную модель?" },
    { id: 5, text: "Как использовать GLB файлы?" },
  ];

  return (
    <section
      style={{
        background: `url('/assets/images/info.png') center/cover`,
      }}
      className="relative py-16 min-h-[600px] bg-gradient-to-r 
                      from-[#1a1024]/30 via-[#1a1024]/40 to-[#1a1024]/30"
    >
      <div className="relative max-w-4xl mx-auto px-8 z-10">
        <h2 className="text-4xl text-center mb-12 font-light text-white">
          Часто задаваемые вопросы
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {items.slice(0, 3).map((item) => (
              <div key={item.id} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <h3 className="text-lg text-white font-medium mb-2">
                  {item.text}
                </h3>
                <p className="text-white/70 text-sm">
                  {item.id === 1 && "Загружаете фото, ИИ анализирует глубину и создает объемную модель"}
                  {item.id === 2 && "Лучше всего работают четкие фото с хорошим освещением и контрастом"}
                  {item.id === 3 && "Модели сохраняются в формате GLB - стандарт для 3D в интернете"}
                </p>
              </div>
            ))}
          </div>
          
          <div className="space-y-6">
            {items.slice(3).map((item) => (
              <div key={item.id} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <h3 className="text-lg text-white font-medium mb-2">
                  {item.text}
                </h3>
                <p className="text-white/70 text-sm">
                  {item.id === 4 && "GLB файлы можно импортировать в Blender, Unity, Three.js и другие редакторы"}
                  {item.id === 5 && "Открывайте в любых 3D программах или просматривайте онлайн"}
                </p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-8 text-white/60">
            <div className="flex flex-col items-center">
              <span className="text-3xl mb-2">⚡</span>
              <span className="text-sm">Быстро</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl mb-2">🎯</span>
              <span className="text-sm">Точно</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl mb-2">💎</span>
              <span className="text-sm">Качественно</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};