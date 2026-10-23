const fs = require('fs');
const path = require('path');

// قائمة صور حقيقية وعالية الجودة للعقارات فقط (شقق، فيلات، استوديوهات، ديكورات داخلية)
const realEstateImages = [
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688", // 1. شقة عصرية
  "https://images.unsplash.com/photo-1613977257363-707ba9348227", // 2. فيلا فاخرة
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267", // 3. شقة مريحة
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750", // 4. إطلالة بحرية / مميزة
  "https://images.unsplash.com/photo-1536376072261-38c75010e6c9", // 5. استوديو صغير
  "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7", // 6. منزل عائلي
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c", // 7. شقة فاخرة
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2", // 8. شقة اقتصادية
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00", // 9. مبنى سكني
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9", // 10. فيلا عصرية
  "https://images.unsplash.com/photo-1497366216548-37526070297c", // 11. مكتب
  "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b", // 12. بنتهاوس
  "https://images.unsplash.com/photo-1507089947368-19c1da9775ae", // 13. شقة ساحلية
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7", // 14. شقة مفروشة
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914", // 15. شقة بحديقة
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c", // 16. دوبلكس
  "https://images.unsplash.com/photo-1555854877-bab0e564b8d5", // 17. غُرفة للطلاب
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab", // 18. عقار تجاري
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d", // 19. فيلا هادئة
  "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6", // 20. استوديو عصري
  "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd", // 21. فيلا بحرية
  "https://images.unsplash.com/photo-1560185007-cde436f6a4d0", // 22. صالة عصرية
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6", // 23. غرفة معيشة مفروشة
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b", // 24. صالة واسعة
  "https://images.unsplash.com/photo-1616594039964-ae9021a400a0", // 25. غرفة نوم فاخرة
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be", // 26. بيت عائلي
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0", // 27. مدخل دوبلكس
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c", // 28. غرفة بسيطة
  "https://images.unsplash.com/photo-1584622650111-993a426fbf0a", // 29. فيلا بحمام سباحة
  "https://images.unsplash.com/photo-1513694203232-719a280e022f"  // 30. غرف منزل عائلي
];

const properties = Array.from({ length: 30 }, (_, index) => ({
  id: index + 1,
  imageUrl: `${realEstateImages[index]}?auto=format&fit=crop&w=800&q=80`
}));

const outputDir = path.join(__dirname, '..', 'properties_images');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function downloadImages() {
  console.log('🚀 Downloading 30 REAL Estate images...\n');

  for (const prop of properties) {
    const filePath = path.join(outputDir, `property_${prop.id}.jpg`);

    try {
      const response = await fetch(prop.imageUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      fs.writeFileSync(filePath, buffer);
      console.log(`✅ [${prop.id}/30] Saved real estate image: property_${prop.id}.jpg`);
    } catch (err) {
      console.error(`❌ Error downloading ${prop.id}:`, err.message);
    }
  }

  console.log(`\n🎉 All 30 property images downloaded successfully to: ${outputDir}`);
}

downloadImages();
