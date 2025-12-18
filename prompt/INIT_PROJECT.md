ช่วยเขียน TODO สำหรับโปรเจค /Users/marosdeeuma/game-asset-tool-nextjs

สร้างเว็บแอพ สำหรับ เป็นเครื่องมือช่วยในการเขียนเกม เช่น พวก texture, tilemap tileset, spritesheet, spriteset (แรงบันดาลใจจากแอพ Tile Editor และ TexturePacker)

โดยสามารถ export ได้หลาย format เช่น cocos creator, phaser, unity

ใส่ทุกฟีเจอร์ที่คิดว่าเว็บแอพระดับโลกเขามีและทำกันนะครับ

โดยทุกครั้งที่สร้าง page.tsx ต้องทำตาม rule ที่เขียนไว้ที่ /Users/marosdeeuma/game-asset-tool-nextjs/prompt/CREATE_PAGE_PATTERN.md

ตามหลัก SOLID Clean

เริ่มพัฒนาโปรเจคอันดับแรกเลย ต้องสร้างหน้า MainLayout พร้อม Header Footer และใส่ Theme Toggle เพื่อทำ dark mode

MainLayout ต้องให้ออกแบบให้ เป็น Full screen ห้าม scroll อารมณ์เหมือนใช้เว็บแอพ

โดย MainLayout ให้ออกแบบ interface เหมือน Internet Explorer 5 Browser ตามรูป /Users/marosdeeuma/game-asset-tool-nextjs/prompt/internet_explorer_5_on_windows_98.png

ให้ใช้ tailwindcss สำหรับทำ style ที่ /Users/marosdeeuma/game-asset-tool-nextjs/public/styles/index.css

จากนั้น สร้าง Landing page ต่อได้เลย
