# وضعیت پروژه — The Mage

**آخرین به‌روزرسانی:** 2026-11-17  
**وضعیت این بازسازی:** چهار فایل با [PR #20](https://github.com/aliinreallife/the-mage/pull/20) در `main` ادغام شدند (merge `0b3d6298`)، بدون تغییر منطق بازی. **مبنای کد بررسی‌شده:** `main@bf0d32e80bd09d8873b8bd59fc8a00401dd3ee59`. **مبنای پژوهش جاری:** PR باز [#16](https://github.com/aliinreallife/the-mage/pull/16) در `feat/reference-leveling-v1-experimental@df98c12356e7d097bcedc2c3da0c00fa41c10f04`. وضعیت محلی `git status` از اتصال GitHub قابل مشاهده نیست و نباید «clean» فرض شود.

## تصویر فعلی

- **در `main` موجود:** بازی فارسی RTL با React/Vite/Canvas، چهار قهرمان، حالت Stage/Endless، سه سختی، مبارزه/دشمن/باس/موج، spell/passive/talent/fusion، Artifact/Set، پژوهش/Gold، ذخیره و checkpoint، PWA و مسیر APK آزمایشی. این‌ها **شواهد وجود قابلیت در کد** هستند، نه تأیید نهایی روی گوشی.
- **تست و build:** `main@bf0d32e` در CI و Android Debug APK موفق بود؛ [آزمون PR #20](https://github.com/aliinreallife/the-mage/actions/runs/44245972899) و [CI پس از merge روی `main@0b3d6298`](https://github.com/aliinreallife/the-mage/actions/runs/44246103294) نیز **success** شدند، شامل بررسی read-only ساختار مستندات، تست‌ها و build وب. این‌ها اثبات اجرای Android روی گوشی نیستند؛ در این جلسه تست local/Chromium/سخت‌افزار انجام نشد.
- **تحقیق و پیشرفت ادغام‌نشده:** در PR #16، reference leveling، ۱۲۱ شناسهٔ توانایی، قواعد جزئی انتخاب، ۱۳۱ stat پایه، ۱۸۹ effect slot، ۱۲۶ رویداد ذخیره‌شدهٔ rank/effect (با تفاوتِ ordinal و rank) و انتقال پارامترهای bullet→enemy/explosion به‌صورت pure/آزمایشی پیاده شده‌اند؛ تست‌های کد پیشین این شاخه در GitHub موفق بودند و بررسی آخرین commit جداگانه ادامه دارد؛ **این کار نه روی main است، نه runtime parity تاییدشده**. فرمول‌های اصلی کارت/آسیب/لول main هنوز تقریبی‌اند.
- **آمادگی انتشار:** نسخهٔ قابل‌دانلود [Android preview #29](https://github.com/aliinreallife/the-mage/releases/download/android-test-29/the-mage.apk) (شاخهٔ پایدار پیش از این آزمایش‌های مرجع) وجود دارد اما دستگاه واقعی، طول عمر آفلاین/حرارت/فریم، نصب/ارتقای دارای امضای پایدار و تست انسانی گزارش‌شده به‌عنوان تأیید نشده باقی‌اند. release آزمایشی ≠ انتشار فروشگاهی.
- **مستندسازی:** چهار فایل رسمی `the-mage-docs/` روی `main` فعال‌اند؛ PRD معتبر پیشین در درخت مخزن یافت نشد، پس PRD فعلی **پیش‌نویس بازسازی‌شده** است. `docs/DECISIONS.md` و گزارش‌های قدیمی بدون حذف در جای خود حفظ شده‌اند. `AGENTS.md` و `README.md` مسیر رسمی را معرفی می‌کنند؛ `node docs/check-project-docs.mjs` به‌صورت read-only در CI اجرا می‌شود.
- **سطح بررسی:** README، AGENTS، manifest/scripts/CI، docs تصمیم/نقشه راه/آزمون/QA، بخش‌های اصلی موتور و UI و PR #16 از راه GitHub بررسی شدند. همهٔ source، تمام تست‌ها، تاریخچهٔ چت‌ها و اجرای واقعی دستگاه به‌طور جامع بازرسی نشده‌اند.

## کارهای باز

| تسک | هدف و شرط پایان | وضعیت | پیشرفت / مانع / اقدام باقی‌مانده |
|---|---|---|---|
| T-002 | آزمون فیزیکی Android شامل نصب، آفلاین، checkpoint، safe area، ۱۵–۲۰ دقیقه بار سنگین، FPS/GC/گرما/لمس | در صف | CI/WebView build موفق گواه عملکرد روی دستگاه نیست؛ از `docs/QA-CHECKLIST.md` استفاده شود |
| T-003 | برابری قابل اندازه‌گیری 0.9941 برای لول، انتخاب، جادو/Projectile، دشمن، موج، RNG و محتوای مرجع | در حال انجام | PR #16: بازپخش ۱۲۶ stored event و انتقال generic bullet-hit اضافه شد؛ **تطبیق runtime، زمان‌بندی UI→effect، reapplication و spawn اختصاصی Magic Bolt نامعلوم** |
| T-004 | تعیین تکلیف دامنهٔ بازآفرینی هویت بصری و دارایی‌های مرجع، با پشتوانهٔ روشن و حقوق انتشار | منتظر بررسی | درخواست‌های تاریخی و `AGENTS.md` یکسان نیستند؛ بدون ثبت تصمیم جدید، PRD را قطعی نکنید |
| T-005 | یکسان‌سازی آزمون انسانی سطح/کارت با تصمیم نوع توانایی و رفتار نهایی main | مسدود | `docs/QA-CHECKLIST.md` هنوز «rare/epic» برای کارت لول دارد؛ اصلاح نوع کارت در PR #16 است و هنوز merge نشده |
| T-006 | تصمیم روی بستر انتشار Android و مهاجرت احتمالی موتور با شواهد واقعی، امضای پایدار و برنامهٔ حفظ داده | در صف | پس از T-002؛ شناسه‌های فعلی Capacitor برای تست هستند، نه قرارداد store |
| T-007 | بررسی/پذیرش PRD بازسازی‌شده یا ارائهٔ PRD معتبر قبلی از خارج Git | منتظر بررسی | سندِ حاضر شواهد کد و اهداف را جدا کرده و اختلاف‌های دامنه را آشکار گذاشته است |

## ادامه از اینجا

- **قدم بعدی توسعه:** T-003: پس از ساخت و آزمون read-only از ۱۲۶ stored event، از native trace اختصاصی `Magic Bolt Bullet_Create → derived UnitApply_Attack → reset/reapplication → collision/damage` با fixture ادامه دهید؛ PR #16 را از `main` و APK پایدار جدا نگه دارید.
- **قدم بعدی مستندات:** T-007: بازبینی و پذیرش بخش‌های نیازمند تأیید PRD؛ اختلاف هویت بصری در T-004 حل شود. برای هر جلسهٔ بعدی از همین status و شناسه‌های موجود استفاده کنید.
- **در مسیر محصول:** T-003؛ از `docs/reference/` و PR #16 به trace «Magic Bolt base → effect/rank → modifier reapplication → projectile hit» با fixture و بدون حدس ادامه دهید.
- **اطلاعات لازم:** اعتبار و دامنهٔ نهایی درخواست‌های بصری برای T-004؛ گزارش تست واقعی دستگاه برای T-002؛ شاهد native runtime برای T-003.
- **مرز تغییر:** هیچ commit این شاخه نباید بازی، balance، ذخیره یا بستهٔ Android را تغییر دهد؛ فایل‌های اصلی PRD/تصمیم قدیمی هم حذف نشوند.

## تاریخچهٔ کارها

### 2026-11-17

#### T-003 — بازپخش رویدادهای ذخیره‌شده و انتقال پارامترهای برخورد | پیشرفت روی PR #16
- **انجام‌شده:** روی شاخهٔ آزمایشی `feat/reference-leveling-v1-experimental`، ۱۲۶ `per_level_effects` واقعی از ۲۱ جادو با ۱۸۹ raw slot تطبیق داده شدند؛ بازپخش اثرها با مقادیر **صریح** ورودی، و انتقال پارامترهای `BulletAttack → Unit_Damage` و شاخهٔ explosion/direct به صورت pure اضافه شد. کد production، ذخیره و توزیع APK تغییر نکرد.
- **بررسی:** SHA-256 همهٔ stored-eventها، تست Magic Bolt با slotهای no-op و آزمون عبور آرگومان/مرز pierce در `tests/reference-stored-magic-events.test.ts` و `tests/reference-bullet-transfer.test.ts`. GitHub [CI قبلی](https://github.com/aliinreallife/the-mage/actions/runs/44252952802) موفق؛ [CI آخرین اصلاح](https://github.com/aliinreallife/the-mage/actions/runs/44253081535) هنگام نگارش در حال بررسی بود. تست native-runtime/گوشی **انجام نشد**.
- **باقی‌مانده / ارجاع:** `docs/reference/SOURCE-MAGIC-STORED-EVENTS.md` در PR #16؛ پیدا کردن فراخوان اختصاصی Magic Bolt و initial `AllyUnitVar`، ترتیب اعمال/محاسبهٔ damage؛ T-003 باز می‌ماند.

#### T-001 — بازسازی و استقرار سیستم چهار فایلی | تکمیل
- **انجام‌شده:** PRD مبتنی بر شواهد بازسازی شد؛ D-001..D-007 و T-001..T-007 ثبت شدند؛ راهنمای ده‌بخشی و checker خواندنی اضافه، لینک‌های README/AGENTS اصلاح، و PR #20 در `main` ادغام شد. `docs/DECISIONS.md` و تمام گزارش‌های قدیمی حفظ شده‌اند. این بازسازی، گزارش ایجاد دوبارهٔ ویژگی‌های بازی نیست.
- **بررسی:** بررسی ساختار GitHub و منابع کد/اسناد، تأیید چهار فایل و یکتایی شناسه‌ها؛ [CI شاخه](https://github.com/aliinreallife/the-mage/actions/runs/44245972899) و [CI پس از ادغام](https://github.com/aliinreallife/the-mage/actions/runs/44246103294) با نتیجهٔ **success**. چک مستندات read-only است؛ اجرای مستقل روی سخت‌افزار یا local انجام نشد. PRD قدیمی در مخزن دیده نشد؛ local `git status` قابل‌مشاهده نبود.
- **باقی‌مانده / ارجاع:** استقرار T-001 کامل است؛ **پذیرش PRD** وظیفهٔ مستقل T-007، و حل تعارض هویت بصری T-004 باقی می‌ماند.

#### T-003 — ثبت مرز پیشرفت پژوهش تا PR #16 | بازسازی وضعیت، نه پیاده‌سازی امروز
- **انجام‌شده:** وضعیت گزارش‌شدهٔ PR بازِ leveling و magic data در `status` تفکیک شد؛ PR #16 شامل ۱۲۱ شناسه، ۱۳۱ مقدار پایه، ۱۸۹ slot و پل level-up توسعه‌ای است.
- **بررسی:** metadata شاخه/commit و نتیجهٔ GitHub Actions آن در سوابق مربوط موجود است. **هیچ آزمون native-runtime یا دستگاه واقعی در این بررسی اجرا نشد.**
- **باقی‌مانده / ارجاع:** شرط پایان T-003 تحقق نیافته؛ حفظ شواهد و پیشبرد پروندهٔ projectile و schedule.

#### T-002 — بازسازی وضعیت آزمون و انتشار | کار باز
- **انجام‌شده:** گزارش‌های تاریخی `docs/PHASE1-STATUS.md` و `docs/ANDROID-TESTING.md` با pipeline موجود مقایسه و خط تفکیک Build/QA مشخص شد.
- **بررسی:** GitHub CI روی `main@bf0d32e` موفق؛ این نتیجه معادل اندازه‌گیری سخت‌افزاری یا تست انسانی نیست.
- **باقی‌مانده / ارجاع:** آزمون عملی T-002 و سپس تصمیم T-006.
