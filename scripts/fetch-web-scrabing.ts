import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

async function scrapeHTML() {
  const totalPages = 3;
  const properties: any[] = [];

  console.log('🚀 جاري بدء سحب الـ HTML عبر Playwright + Cheerio...\n');

  // فتح متصفح Chromium في الخلفية
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  for (let p = 1; p <= totalPages; p++) {
    const pageUrl = `https://www.dubizzle.com.eg/properties/?page=${p}`;
    console.log(`🌐 فتح الصفحة ${p}: ${pageUrl}`);

    try {
      // تحميل الصفحة وانتظار معالجة الجافاسكريبت والـ DOM
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });

      // الانتظار ثواني بسيطة لضمان تحميل عناصر العقارات
      await page.waitForTimeout(3000);

      // سحب الـ HTML الكامل بعد معالجته داخل المتصفح
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);

      // استخراج الكروت بكافة الـ Selectors المحتملة في دبيزل
      const items = $('article, li[aria-label="Listing"], [data-aut-id="itemBox"]');

      if (items.length === 0) {
        console.log(`⚠️ لم يتم العثور على عناصر في الصفحة ${p}.`);
        continue;
      }

      let pageCount = 0;
      items.each((_, el) => {
        const title =
          $(el).find('[data-aut-id="itemTitle"]').text().trim() ||
          $(el).find('h2').text().trim() ||
          $(el).find('a[title]').attr('title')?.trim() ||
          '';

        const priceText =
          $(el).find('[data-aut-id="itemPrice"]').text().trim() ||
          $(el).find('span:contains("ج.م")').text().trim() ||
          '';

        const locationText =
          $(el).find('[data-aut-id="itemLocation"]').text().trim() || '';

        const relativeUrl = $(el).find('a').attr('href') || '';
        const imgUrl =
          $(el).find('img').attr('src') ||
          $(el).find('img').attr('data-src') ||
          '';

        const priceNumeric = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || 0;

        if (title && title.length > 3) {
          properties.push({
            id: String(Math.floor(Math.random() * 1000000)),
            title,
            price: priceNumeric,
            currency: 'EGP',
            location: locationText || 'القاهرة',
            type: title.includes('إيجار') || title.includes('ايجار') ? 'RENT' : 'SALE',
            imageUrl: imgUrl,
            url: relativeUrl.startsWith('http')
              ? relativeUrl
              : `https://www.dubizzle.com.eg${relativeUrl}`,
          });
          pageCount++;
        }
      });

      console.log(`✅ تم سحب صفحة ${p} (جلب ${pageCount} عقار)`);
      await page.waitForTimeout(2000);
    } catch (err: any) {
      console.error(`❌ خطأ في الصفحة ${p}:`, err.message);
    }
  }

  await browser.close();

  // حفظ النتيجة في data.json
  const filePath = path.join(__dirname, 'data.json');
  fs.writeFileSync(filePath, JSON.stringify(properties, null, 2), 'utf-8');

  console.log(`\n🎉 اكتمل السحب! تم حفظ ${properties.length} عقار في:`);
  console.log(`📁 ${filePath}`);
}

scrapeHTML();
