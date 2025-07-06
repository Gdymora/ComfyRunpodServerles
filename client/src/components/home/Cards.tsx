// src/components/home/Cards.tsx - Updated for 3D Generation

interface Card {
  id: number;
  image: string;
  alt?: string;
  title: string;
}

export const Cards: React.FC = () => {
  const cards: Card[] = [
    { 
      id: 1, 
      image: "/assets/images/3d_example1.png", 
      alt: "3D Model Example 1",
      title: "Персонаж из фото"
    },
    { 
      id: 2, 
      image: "/assets/images/3d_example2.png", 
      alt: "3D Model Example 2",
      title: "Объект в 3D"
    },
    { 
      id: 3, 
      image: "/assets/images/3d_example3.png", 
      alt: "3D Model Example 3",
      title: "Лицо в объеме"
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto my-8">
      <h3 className="text-2xl text-white text-center mb-8">
        Примеры 3D моделей
      </h3>
      
      <div className="relative w-full h-[320px] md:h-[400px] mx-auto">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className={`absolute w-[280px] h-[280px] md:w-[350px] md:h-[350px]
                       bg-gradient-to-br from-purple-600/20 to-blue-600/20 
                       backdrop-blur-sm border border-white/10
                       rounded-xl overflow-hidden
                       shadow-2xl transition-all duration-500 hover:rotate-0 hover:-translate-y-4 hover:z-10 hover:scale-105
                       ${
                         index === 0
                           ? "-rotate-12 -translate-x-8 md:-translate-x-16 z-[1] left-0"
                           : index === 1
                           ? "rotate-0 z-[3] left-1/2 transform -translate-x-1/2"
                           : "rotate-12 translate-x-8 md:translate-x-16 z-[2] right-0"
                       }`}
          >
            <div className="relative w-full h-full">
              {/* Заглушка для зображення або реальне зображення */}
              <div className="w-full h-4/5 bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center">
                <div className="text-center text-white/70">
                  <div className="text-6xl mb-2">🎭</div>
                  <p className="text-sm">{card.title}</p>
                </div>
              </div>
              
              {/* Нижня панель з назвою */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm p-3">
                <p className="text-white text-sm text-center font-medium">
                  {card.title}
                </p>
              </div>
              
              {/* Гlow ефект */}
              <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 via-transparent to-blue-500/10 pointer-events-none" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center mt-8">
        <p className="text-white/60 text-sm">
          Поддерживаются форматы: JPG, PNG, WEBP
        </p>
      </div>
    </div>
  );
};