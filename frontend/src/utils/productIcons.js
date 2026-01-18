import {
    Book, Gamepad2, Shirt, Smartphone, Palette, Box,
    LaptopMinimal, Tablet, Headphones, Newspaper,
    Footprints, IdCard, Sparkles, Rabbit, KeyRound, Monitor, PersonStanding
} from 'lucide-react';

export const CATEGORY_ICONS = {
    Books: Book,
    Games: Gamepad2,
    Fashion: Shirt,
    Electronics: Smartphone,
    Hobbies: Palette,
    Other: Box,
};

export const getIconForProduct = (product) => {
    const name = (product.nameJp || product.name || '').toLowerCase();

    // Electronics
    if (name.includes('ノートpc') || name.includes('laptop')) return LaptopMinimal;
    if (name.includes('タブレット') || name.includes('ipad') || name.includes('tablet')) return Tablet;
    if (name.includes('イヤホン') || name.includes('earbuds')) return Headphones;
    if (name.includes('スマートフォン') || name.includes('スマホ') || name.includes('phone')) return Smartphone;
    if (name.includes('モニター') || name.includes('monitor')) return Monitor;

    // Games
    if (name.includes('ソフト') || name.includes('disc')) return Gamepad2;
    if (name.includes('switch') || name.includes('ps4') || name.includes('game')) return Gamepad2;

    // Media / Books
    if (name.includes('雑誌') || name.includes('magazine')) return Newspaper;
    if (name.includes('コミック') || name.includes('manga') || name.includes('本') || name.includes('book')) return Book;

    // Fashion
    if (name.includes('スニーカー') || name.includes('靴') || name.includes('sneaker')) return Footprints;
    if (name.includes('tシャツ') || name.includes('パーカー') || name.includes('服') || name.includes('shirt') || name.includes('coat')) return Shirt;

    // Hobbies
    if (name.includes('トレカ') || name.includes('card')) return IdCard;
    if (name.includes('ちびぐるみ') || name.includes('ぬいぐるみ') || name.includes('plush')) return Rabbit;
    if (name.includes('フィギュア') || name.includes('figure') || name.includes('アクリルスタンド')) return PersonStanding;
    if (name.includes('キーホルダー') || name.includes('key')) return KeyRound;
    if (name.includes('リップ') || name.includes('cosmetic') || name.includes('ファンデーション')) return Sparkles;

    // Fallback to Category
    return CATEGORY_ICONS[product.category] || Box;
};
