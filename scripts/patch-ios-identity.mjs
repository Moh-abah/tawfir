#!/usr/bin/env bun
/**
 * patch-ios-identity.mjs — تفعيل هوية «توفير» في مشروع iOS المولَّد (SPM)
 * ══════════════════════════════════════════════════════════════════════
 * يُشغَّل بعد:  npx cap add ios  &&  npx capacitor-assets generate --ios
 *              &&  npx cap sync ios
 * (محلياً أو داخل GitHub Actions — انظر .github/workflows/build-ios.yml)
 *
 * ماذا يفعل؟
 *   1) Info.plist            : قفل الاتجاه Portrait (تجربة Native أصيلة)
 *                              + iPhone فقط (إسقاط iPad — أسهل قبولًا في
 *                              المراجعة ولا لقطات iPad مطلوبة) + arm64
 *                              + أذونات iOS بالعربية (الموقع/الكاميرا/
 *                              الصور — بدلها أي استدعاء يُسقط التطبيق!)
 *                              + ITSAppUsesNonExemptEncryption=false
 *                              (تصريح التشفير القياسي — يختصر خطوة
 *                              المراجعة) + UIStatusBarStyle داكن عند
 *                              الإقلاع (يطابق السبلاش الفاتح) + عرض
 *                              الإشعارات في المقدمة (banner+sound).
 *   2) App.entitlements      : aps-environment=production (FCM) +
 *                              associated-domains لـ tawfir.giize.com
 *                              (Universal Links — نظير assetlinks).
 *   3) project.pbxproj       : ربط الملفات الجديدة + إعدادات البناء
 *                              (الإصدار/الجهاز/الفريق/الـentitlements).
 *   4) App.xcscheme          : توليد Scheme مشترك — بدونه يفشل
 *                              «xcodebuild archive -scheme App» في CI
 *                              (قالب Capacitor SPM لا يشمله).
 *   5) TawfirNativePlugin    : إضافة Swift أصلية (نظير TawfirNative في
 *      + TawfirFirebaseBridge   أندرويد): getFcmToken / getSafeAreaInsets
 *                              / setSystemBars — نفس أسماء الطرق التي
 *                              يقرأها src/lib/capacitor.ts فيعمل كود
 *                              الويب الحالي بلا أي تعديل إضافي.
 *   6) FCM أصلي 100%         : إن وُجد GoogleService-Info.plist في جذر
 *                              المستودع (ومطابق للـBundle ID) يُفعَّل
 *                              FirebaseMessaging عبر SPM: تهيئة +
 *                              طلب إذن الإشعارات عند الإقلاع (نفس سلوك
 *                              أندرويد POST_NOTIFICATIONS) + اشتراك
 *                              tawfir_all + توكن FCM عبر الجسر يسجّله
 *                              FcmRegistrar في الباك إند (POST /fcm/token)
 *                              + عرض إشعارات المقدمة + توجيه الـWebView
 *                              لنقرة الإشعار (cold start معلَّق حتى جهوزية
 *                              الجسر).
 *
 * مدخلات البيئة (اختيارية):
 *   VERSION_NAME   اسم الإصدار CFBundleShortVersionString (الافتراضي من package.json)
 *   VERSION_CODE   رقم البناء CFBundleVersion (الافتراضي 1)
 *   APPLE_TEAM_ID  معرّف فريق Apple — يُكتب DEVELOPMENT_TEAM (للتوقيع
 *                  الآلي في CI؛ بدون يُبنى غير موقّع)
 *
 * ⚠ لا تُشغَّل npx cap sync ios بعد هذا السكربت — sync يعيد توليد
 *   Package.swift و packageClassList فيطمس تعديلات Firebase/التسجيل.
 *   (سير العمل يشغّل sync قبل السكربت حصراً).
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = process.cwd();
const IOS = resolve(ROOT, "ios/App");

/* ─── أدوات مساعدة ─────────────────────────────────────────────── */

function fail(msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
  process.exit(1);
}
function ok(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}
function info(msg) {
  console.log(`ℹ ${msg}`);
}
/** استبدال مضمون: إن لم يوجد النمط مرة واحدة على الأقل نُخفق بصوت عالٍ */
function replaceOnce(text, pattern, replacement, label, { all = false } = {}) {
  const count = text.match(pattern)?.length ?? 0;
  if (count === 0) fail(`${label}: النمط غير موجود — هل قالب Capacitor تغيّر؟`);
  return all ? text.replace(pattern, replacement) : text.replace(pattern, replacement);
}

/* ─── 0) فحوص أولية ─────────────────────────────────────────────── */

if (!existsSync(join(IOS, "App/AppDelegate.swift"))) {
  fail("ios/App غير موجود — شغّل npx cap add ios أولاً");
}

const capJsonPath = join(IOS, "App/capacitor.config.json");
const capJson = JSON.parse(readFileSync(capJsonPath, "utf8"));
const appId = capJson.appId;
const appName = capJson.appName;
const isOwner = appId.endsWith(".owner");
info(`التطبيق: ${appName} (${appId})${isOwner ? " — نسخة المالك" : ""}`);

/* الإصدار — من البيئة أو package.json */
let pkgVersion = "1.0.0";
try {
  pkgVersion = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version ?? "1.0.0";
} catch { /* افتراضي */ }
const VERSION_NAME = process.env.VERSION_NAME || pkgVersion;
const VERSION_CODE = String(process.env.VERSION_CODE || "1");
const APPLE_TEAM_ID = (process.env.APPLE_TEAM_ID || "").trim();
if (APPLE_TEAM_ID && !/^[A-Z0-9]{10}$/.test(APPLE_TEAM_ID)) {
  fail(`APPLE_TEAM_ID غير صالح: "${APPLE_TEAM_ID}" — يجب أن يكون 10 أحرف (App Store Connect → Membership Details)`);
}

/* ─── 1) فحص Firebase: GoogleService-Info.plist ─────────────────── */

const plistCandidates = isOwner
  ? [join(ROOT, "GoogleService-Info-owner.plist"), join(ROOT, "GoogleService-Info.plist")]
  : [join(ROOT, "GoogleService-Info.plist")];

let firebaseEnabled = false;
let plistBundleId = null;
for (const p of plistCandidates) {
  if (!existsSync(p)) continue;
  const content = readFileSync(p, "utf8");
  const m = content.match(/<key>BUNDLE_ID<\/key>\s*<string>([^<]+)<\/string>/);
  plistBundleId = m?.[1] ?? null;
  if (plistBundleId === appId) {
    firebaseEnabled = true;
    copyFileSync(p, join(IOS, "App/GoogleService-Info.plist"));
    break;
  }
  info(`⚠ ${p}: BUNDLE_ID (${plistBundleId}) لا يطابق ${appId} — يُتجاهل`);
}
if (!firebaseEnabled) {
  info("Firebase/FCM غير مفعّل — لا GoogleService-Info.plist مطابق في جذر المستودع (الإشعارات الأصلية معطّلة)");
} else {
  ok(`Firebase مفعّل — GoogleService-Info.plist (BUNDLE_ID=${plistBundleId}) نُسخ إلى ios/App/App/`);
}

/* ─── 2) Info.plist — الهوية والأذونات والاتجاه ─────────────────── */

const infoPlistPath = join(IOS, "App/Info.plist");
let infoPlist = readFileSync(infoPlistPath, "utf8");

/* 2-أ) الاسم المعروض — cap add يكتب appName؛ نتحقق فقط */
if (!infoPlist.includes(`<string>${appName}</string>`)) {
  infoPlist = replaceOnce(
    infoPlist,
    /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]+(<\/string>)/,
    `$1${appName}$2`,
    "CFBundleDisplayName",
  );
}

/* 2-ب) قفل الاتجاه Portrait — حذف أسطر Landscape من مصفوفة iPhone */
infoPlist = infoPlist
  .split("\n")
  .filter((line) => !line.includes("UIInterfaceOrientationLandscape"))
  .join("\n");

/* 2-ج) إسقاط قيود iPad كلياً (iPhone فقط — TARGETED_DEVICE_FAMILY=1) */
{
  const idx = infoPlist.indexOf("<key>UISupportedInterfaceOrientations~ipad</key>");
  if (idx !== -1) {
    const end = infoPlist.indexOf("</array>", idx);
    if (end === -1) fail("إغلاق مصفوفة ~ipad غير موجود");
    /* نحذف من بداية المفتاح إلى نهاية المصفوفة + السطر الجديد التالي */
    const after = infoPlist.slice(end + "</array>".length).replace(/^\s*\n/, "");
    infoPlist = infoPlist.slice(0, idx) + after;
  }
}

/* 2-د) arm64 بدل armv7 (القالب القديم يطلب معمارية 32-بت متقادمة) */
infoPlist = replaceOnce(
  infoPlist,
  /<string>armv7<\/string>/,
  "<string>arm64</string>",
  "UIRequiredDeviceCapabilities",
);

/* 2-هـ) أذونات iOS بالعربية + إعدادات القبول — تُضاف قبل </dict> الختامية */
const extraKeys = [];
const pushKey = (k, v) => extraKeys.push(`\t<key>${k}</key>\n${v}`);
pushKey("NSLocationWhenInUseUsageDescription", "\t<string>نستخدم موقعك لعرض المتاجر والمنتجات القريبة منك وتحديد عنوان التوصيل داخل تطبيق توفير.</string>");
pushKey("NSCameraUsageDescription", "\t<string>نستخدم الكاميرا لالتقاط صور المنتجات أو الملف الشخصي عند الحاجة.</string>");
pushKey("NSPhotoLibraryUsageDescription", "\t<string>نستخدم مكتبة الصور لاختيار صور المنتجات أو الملف الشخصي.</string>");
pushKey("NSPhotoLibraryAddUsageDescription", "\t<string>نسمح بحفظ صور المنتجات في مكتبة صورك عند الطلب.</string>");
/* تصريح التشفير: التطبيق يستخدم HTTPS القياسي فقط — يُعفي من أسئلة
   التصدير السنوية في App Store Connect (ITSAppUsesNonExemptEncryption) */
pushKey("ITSAppUsesNonExemptEncryption", "\t<false/>");
/* أيقونات شريط الحالة الداكنة عند الإقلاع — تطابق السبلاش الفاتح
   (الوضع الداكن يضبطه @capacitor/status-bar من الويب بعد الترطيب) */
pushKey("UIStatusBarStyle", "\t<string>UIStatusBarStyleDarkContent</string>");
if (firebaseEnabled) {
  /* استلام FCM في الخلفية (رسائل data + تسليم موثوق) */
  pushKey("UIBackgroundModes", "\t<array>\n\t\t<string>remote-notification</string>\n\t</array>");
}
infoPlist = replaceOnce(
  infoPlist,
  /<\/dict>\s*<\/plist>\s*$/,
  `${extraKeys.join("\n")}\n</dict>\n</plist>\n`,
  "إضافة مفاتيح Info.plist",
);
writeFileSync(infoPlistPath, infoPlist);
ok(`Info.plist: Portrait فقط + iPhone فقط + arm64 + ${extraKeys.length} مفتاحاً (أذونات/قبول)`);

/* ─── 3) Entitlements — Push + Universal Links ──────────────────── */

const entitlementsPath = join(IOS, "App/App.entitlements");
const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<!-- إشعارات FCM عبر APNs -->
\t<key>aps-environment</key>
\t<string>production</string>
\t<!-- الروابط العميقة Universal Links — نظير assetlinks.json في أندرويد.
\t     يعمل مع /.well-known/apple-app-site-association على الموقع + فريق
\t     مطابق (الملف يقرأ APPLE_TEAM_ID من بيئة الموقع). -->
\t<key>com.apple.developer.associated-domains</key>
\t<array>
\t\t<string>applinks:tawfir.giize.com</string>
\t</array>
</dict>
</plist>
`;
writeFileSync(entitlementsPath, entitlements);
ok("App.entitlements: aps-environment=production + applinks:tawfir.giize.com");

/* ─── 4) project.pbxproj — ملفات + إعدادات بناء ────────────────── */

const pbxPath = join(IOS, "App.xcodeproj/project.pbxproj");
let pbx = readFileSync(pbxPath, "utf8");

/* معرفات ثابتة 24 خانة (نمط pbxproj) لكائناتنا الجديدة */
const ID_SWIFT_REF = "A7F120000000000000000001";
const ID_SWIFT_BLDF = "A7F120000000000000000002";
const ID_PLIST_REF = "A7F120000000000000000003";
const ID_PLIST_BLDF = "A7F120000000000000000004";

const hasSwift = pbx.includes(`/* TawfirNativePlugin.swift */`);
if (!hasSwift) {
  /* 4-أ) PBXBuildFile */
  let buildFiles = `\t\t${ID_SWIFT_BLDF} /* TawfirNativePlugin.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ID_SWIFT_REF} /* TawfirNativePlugin.swift */; };\n`;
  if (firebaseEnabled) {
    buildFiles += `\t\t${ID_PLIST_BLDF} /* GoogleService-Info.plist in Resources */ = {isa = PBXBuildFile; fileRef = ${ID_PLIST_REF} /* GoogleService-Info.plist */; };\n`;
  }
  pbx = replaceOnce(
    pbx,
    /\/\* End PBXBuildFile section \*\//,
    `${buildFiles}/* End PBXBuildFile section */`,
    "PBXBuildFile",
  );

  /* 4-ب) PBXFileReference */
  let fileRefs = `\t\t${ID_SWIFT_REF} /* TawfirNativePlugin.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = TawfirNativePlugin.swift; sourceTree = "<group>"; };\n`;
  if (firebaseEnabled) {
    fileRefs += `\t\t${ID_PLIST_REF} /* GoogleService-Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = GoogleService-Info.plist; sourceTree = "<group>"; };\n`;
  }
  pbx = replaceOnce(
    pbx,
    /\/\* End PBXFileReference section \*\//,
    `${fileRefs}/* End PBXFileReference section */`,
    "PBXFileReference",
  );

  /* 4-ج) مجموعة App (children) — بعد مدخل Info.plist (مرساة ثابتة) */
  let groupEntries = `\t\t\t\t${ID_SWIFT_REF} /* TawfirNativePlugin.swift */,\n`;
  if (firebaseEnabled) {
    groupEntries += `\t\t\t\t${ID_PLIST_REF} /* GoogleService-Info.plist */,\n`;
  }
  pbx = replaceOnce(
    pbx,
    /(\t\t\t\t[0-9A-F]{24} \/\* Info\.plist \*\/,\n)/,
    `$1${groupEntries}`,
    "PBXGroup App children",
  );

  /* 4-د) مرحلة Sources */
  pbx = replaceOnce(
    pbx,
    /(\t\t\t\t[0-9A-F]{24} \/\* AppDelegate\.swift in Sources \*\/,\n)/,
    `$1\t\t\t\t${ID_SWIFT_BLDF} /* TawfirNativePlugin.swift in Sources */,\n`,
    "PBXSourcesBuildPhase",
  );

  /* 4-هـ) مرحلة Resources — GoogleService-Info.plist فقط */
  if (firebaseEnabled) {
    pbx = replaceOnce(
      pbx,
      /(\t\t\t\t[0-9A-F]{24} \/\* LaunchScreen\.storyboard in Resources \*\/,\n)/,
      `$1\t\t\t\t${ID_PLIST_BLDF} /* GoogleService-Info.plist in Resources */,\n`,
      "PBXResourcesBuildPhase",
    );
  }
}

/* 4-و) إعدادات البناء — مستوى الهدف (Debug + Release) */
pbx = replaceOnce(pbx, /MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${VERSION_NAME};`, "MARKETING_VERSION", { all: true });
pbx = replaceOnce(pbx, /CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${VERSION_CODE};`, "CURRENT_PROJECT_VERSION", { all: true });
pbx = replaceOnce(pbx, /TARGETED_DEVICE_FAMILY = [^;]+;/g, `TARGETED_DEVICE_FAMILY = 1;`, "TARGETED_DEVICE_FAMILY", { all: true });
{
  /* entitlements + الفريق — داخل إعدادات الهدف حصراً (حيث INFOPLIST_FILE) */
  let settingsAdd = `\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n`;
  if (APPLE_TEAM_ID) {
    settingsAdd += `\t\t\t\tDEVELOPMENT_TEAM = ${APPLE_TEAM_ID};\n`;
  }
  pbx = replaceOnce(
    pbx,
    /(\t\t\t\tINFOPLIST_FILE = App\/Info\.plist;\n)/g,
    `$1${settingsAdd}`,
    "إعدادات INFOPLIST_FILE (entitlements/team)",
    { all: true },
  );
}
writeFileSync(pbxPath, pbx);
ok(`project.pbxproj: الملفات مربوطة + الإصدار ${VERSION_NAME} (${VERSION_CODE}) + iPhone فقط${APPLE_TEAM_ID ? ` + الفريق ${APPLE_TEAM_ID}` : ""}`);

/* ─── 5) App.xcscheme — Scheme مشترك لـ xcodebuild archive ─────── */

{
  /* استخراج معرّف الهدف App ديناميكياً من pbxproj */
  const m = pbx.match(/([0-9A-F]{24}) \/\* App \*\/ = \{\s*\n\s*isa = PBXNativeTarget;/);
  if (!m) fail("تعذر استخراج معرّف الهدف App من pbxproj");
  const targetId = m[1];
  const schemeDir = join(IOS, "App.xcodeproj/xcshareddata/xcschemes");
  mkdirSync(schemeDir, { recursive: true });
  const scheme = `<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1640"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "${targetId}"
               BuildableName = "App.app"
               BlueprintName = "App"
               ReferencedContainer = "container:App.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "${targetId}"
            BuildableName = "App.app"
            BlueprintName = "App"
            ReferencedContainer = "container:App.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
`;
  writeFileSync(join(schemeDir, "App.xcscheme"), scheme);
  ok(`App.xcscheme: وُلّد Scheme مشترك (الهدف ${targetId}) — xcodebuild archive جاهز`);
}

/* ─── 6) Package.swift — FirebaseMessaging عبر SPM ──────────────── */

if (firebaseEnabled) {
  const pkgPath = join(IOS, "CapApp-SPM/Package.swift");
  let pkg = readFileSync(pkgPath, "utf8");
  if (!pkg.includes("firebase-ios-sdk")) {
    /* تبعية جديدة في نهاية مصفوفة dependencies (فاصلة بادئة — Swift صالح) */
    pkg = replaceOnce(
      pkg,
      /(\n\s*\],\n\s*targets: \[)/,
      `\n        ,\n        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "11.0.0")$1`,
      "Package.swift dependencies",
    );
    /* منتج FirebaseMessaging في تبعيات الهدف */
    pkg = replaceOnce(
      pkg,
      /(\.product\(name: "Cordova", package: "capacitor-swift-pm"\))/,
      `$1,\n                .product(name: "FirebaseMessaging", package: "firebase-ios-sdk")`,
      "Package.swift target dependencies",
    );
    writeFileSync(pkgPath, pkg);
  }
  ok("Package.swift: أُضيف FirebaseMessaging (firebase-ios-sdk ≥ 11.0)");
}

/* ─── 7) capacitor.config.json — تسجيل TawfirNativePlugin ───────── */

{
  const list = capJson.packageClassList;
  if (!list.includes("TawfirNativePlugin")) {
    list.push("TawfirNativePlugin");
    writeFileSync(capJsonPath, JSON.stringify(capJson, null, "\t"));
  }
  ok(`capacitor.config.json: TawfirNativePlugin مُسجَّل (packageClassList = ${list.length} إضافات)`);
}

/* ─── 8) AppDelegate.swift — خطافات توفير الأصلية ───────────────── */

const appDelegate = `import UIKit
import Capacitor
import CapApp_SPM

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // توفير: تهيئة Firebase/FCM + طلب إذن الإشعارات (no-op بلا GoogleService-Info.plist)
        TawfirFirebaseBridge.shared.onFinishLaunching(application)
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // توفير: توكن APNs → Firebase (توكن FCM للإشعارات المستهدفة)
        TawfirFirebaseBridge.shared.onAPNsToken(deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        TawfirFirebaseBridge.shared.onAPNsRegistrationFailed(error)
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
`;
writeFileSync(join(IOS, "App/AppDelegate.swift"), appDelegate);
ok("AppDelegate.swift: خطافات TawfirFirebaseBridge (FCM/APNs) مربوطة");

/* ─── 9) مصادر الحزمة — الإضافة + الجسر ─────────────────────────── */

const spmSources = join(IOS, "CapApp-SPM/Sources/CapApp-SPM");
mkdirSync(spmSources, { recursive: true });

/* 9-أ) TawfirNativePlugin.swift — الإضافة المكشوفة للـWebView
   (نفس طرق TawfirNative في أندرويد — يعمل src/lib/capacitor.ts كما هو) */
const pluginSwift = firebaseEnabled
  ? `import Foundation
import Capacitor
import FirebaseMessaging

/**
 * إضافة TawfirNative الأصلية — نظير Swift لما يولّده
 * patch-android-identity.mjs في أندرويد (نفس أسماء الطرق).
 * تسجَّل آلياً عبر packageClassList في capacitor.config.json.
 */
@objc(TawfirNativePlugin)
public class TawfirNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TawfirNativePlugin"
    public let jsName = "TawfirNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getFcmToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isNativePushAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSafeAreaInsets", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setSystemBars", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        TawfirFirebaseBridge.shared.plugin = self
        TawfirFirebaseBridge.shared.consumePendingRoute(into: self)
    }

    /// توكن FCM الأصلي — يقرأه FcmRegistrar في الويب ويسجّله في الباك إند
    @objc func getFcmToken(_ call: CAPPluginCall) {
        if let cached = UserDefaults.standard.string(forKey: TawfirFirebaseBridge.fcmTokenKey), !cached.isEmpty {
            call.resolve(["token": cached, "available": true])
            return
        }
        Messaging.messaging().token { token, _ in
            if let token = token, !token.isEmpty {
                UserDefaults.standard.set(token, forKey: TawfirFirebaseBridge.fcmTokenKey)
                call.resolve(["token": token, "available": true])
            } else {
                call.resolve(["available": false])
            }
        }
    }

    @objc func isNativePushAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": true])
    }

    /// Safe-Area الفعلية (نوتش/Dynamic Island) — متغيرات CSS في الويب
    @objc func getSafeAreaInsets(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let window = UIApplication.shared.connectedScenes
                .compactMap({ ($0 as? UIWindowScene)?.keyWindow }).first {
                let insets = window.safeAreaInsets
                call.resolve(["top": insets.top, "bottom": insets.bottom])
            } else {
                call.resolve()
            }
        }
    }

    /// iOS بلا شريط تنقل سفلي؛ شريط الحالة يديره @capacitor/status-bar من الويب
    @objc func setSystemBars(_ call: CAPPluginCall) {
        call.resolve()
    }
}
`
  : `import Foundation
import Capacitor

/**
 * إضافة TawfirNative الأصلية (بلا Firebase — لا GoogleService-Info.plist
 * مطابق). توفر Safe-Area فقط؛ الإشعارات تُبلِّغ available=false فيسلك
 * الويب مساره العادي بلا تسجيل أصلي.
 */
@objc(TawfirNativePlugin)
public class TawfirNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TawfirNativePlugin"
    public let jsName = "TawfirNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getFcmToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isNativePushAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSafeAreaInsets", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setSystemBars", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        TawfirFirebaseBridge.shared.plugin = self
    }

    @objc func getFcmToken(_ call: CAPPluginCall) {
        call.resolve(["available": false])
    }

    @objc func isNativePushAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": false])
    }

    @objc func getSafeAreaInsets(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let window = UIApplication.shared.connectedScenes
                .compactMap({ ($0 as? UIWindowScene)?.keyWindow }).first {
                let insets = window.safeAreaInsets
                call.resolve(["top": insets.top, "bottom": insets.bottom])
            } else {
                call.resolve()
            }
        }
    }

    @objc func setSystemBars(_ call: CAPPluginCall) {
        call.resolve()
    }
}
`;
writeFileSync(join(spmSources, "TawfirNativePlugin.swift"), pluginSwift);

/* 9-ب) TawfirFirebaseBridge.swift — Firebase + الإشعارات + التنقل */
const bridgeSwift = firebaseEnabled
  ? `import Foundation
import UIKit
import UserNotifications
import FirebaseCore
import FirebaseMessaging

/**
 * جسر توفير الأصلي — تهيئة FCM + الإشعارات + توجيه الـWebView.
 * (نظير Swift لسلوك patch-android-identity.mjs في أندرويد.)
 */
public final class TawfirFirebaseBridge: NSObject, UNUserNotificationCenterDelegate, MessagingDelegate {
    public static let shared = TawfirFirebaseBridge()
    static let topicAll = "tawfir_all"
    static let fcmTokenKey = "tawfir_fcm_token"
    static let siteBase = "https://tawfir.giize.com"

    /// إضافة TawfirNative — للتنقل وإشعار الويب (weak: الجسر لا يملكها)
    weak var plugin: TawfirNativePlugin?
    /// مسار معلَّق من نقرة إشعار وصلت قبل جهوزية الـWebView (إقلاع بارد)
    var pendingRoute: String?

    public func onFinishLaunching(_ application: UIApplication) {
        FirebaseApp.configure()
        Messaging.messaging().delegate = self
        UNUserNotificationCenter.current().delegate = self

        // طلب إذن الإشعارات عند الإقلاع — نفس سلوك أندرويد (POST_NOTIFICATIONS)
        let options: UNAuthorizationOptions = [.alert, .badge, .sound]
        UNUserNotificationCenter.current().requestAuthorization(options: options) { _, _ in
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
        // اشتراك الموضوع العام — الإرسال من Firebase Console بلا خادم
        Messaging.messaging().subscribe(toTopic: TawfirFirebaseBridge.topicAll)
    }

    public func onAPNsToken(_ token: Data) {
        Messaging.messaging().apnsToken = token
    }

    public func onAPNsRegistrationFailed(_ error: Error) {
        // محاكي بلا إشعارات / جهاز غير مسجل — صامت
    }

    // MARK: - MessagingDelegate — تجدد توكن FCM

    public func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        if let t = fcmToken, !t.isEmpty {
            UserDefaults.standard.set(t, forKey: TawfirFirebaseBridge.fcmTokenKey)
        }
    }

    // MARK: - UNUserNotificationCenterDelegate

    /// عرض الإشعارات في المقدمة (نفس سلوك خدمة أندرويد «في كل الحالات»)
    public func userNotificationCenter(_ center: UNUserNotificationCenter,
                                       willPresent notification: UNNotification,
                                       withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }

    /// نقطة إشعار → توجيه الـWebView للمسار المناسب
    public func userNotificationCenter(_ center: UNUserNotificationCenter,
                                       didReceive response: UNNotificationResponse,
                                       withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        if let route = TawfirFirebaseBridge.route(from: userInfo) {
            navigate(to: route)
        }
        completionHandler()
    }

    /// استخراج مسار التوجيه من حمولة FCM (يطابق notifications-meta في الويب)
    static func route(from userInfo: [AnyHashable: Any]) -> String? {
        if let url = userInfo["url"] as? String, !url.isEmpty { return url }
        if let oid = userInfo["order_id"] as? String { return "/orders/\\(oid)" }
        if let oid = userInfo["order_id"] as? NSNumber { return "/orders/\\(oid)" }
        if let pid = userInfo["product_id"] as? String { return "/products/\\(pid)" }
        if let fid = userInfo["facility_id"] as? String { return "/facilities/\\(fid)" }
        return nil
    }

    /// توجيه الـWebView (أصل الموقع الحي) — أو تعليق الرابط حتى جهوزية الجسر
    func navigate(to route: String) {
        let url: URL
        if route.hasPrefix("http"), let u = URL(string: route) {
            url = u
        } else if let u = URL(string: TawfirFirebaseBridge.siteBase + (route.hasPrefix("/") ? route : "/" + route)) {
            url = u
        } else {
            return
        }
        if let webView = plugin?.bridge?.webView {
            DispatchQueue.main.async { webView.load(URLRequest(url: url)) }
        } else {
            pendingRoute = url.absoluteString
        }
    }

    /// استهلاك الرابط المعلق عند جهوزية الإضافة (إقلاع بارد من إشعار)
    func consumePendingRoute(into plugin: TawfirNativePlugin) {
        guard let pending = pendingRoute else { return }
        pendingRoute = nil
        if let u = URL(string: pending) {
            // تأخير قصير: نترك تحميل الموقع الأولي يبدأ ثم نستبدله بمسار الإشعار
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
                if let webView = self?.plugin?.bridge?.webView {
                    webView.load(URLRequest(url: u))
                }
            }
        }
    }
}
`
  : `import Foundation
import UIKit

/**
 * جسر توفير — وضع بلا Firebase (لا GoogleService-Info.plist مطابق).
 * كل الطرق no-op آمنة؛ AppDelegate يستدعيها دون تفريع.
 */
public final class TawfirFirebaseBridge: NSObject {
    public static let shared = TawfirFirebaseBridge()
    static let fcmTokenKey = "tawfir_fcm_token"

    weak var plugin: TawfirNativePlugin?

    public func onFinishLaunching(_ application: UIApplication) { }
    public func onAPNsToken(_ token: Data) { }
    public func onAPNsRegistrationFailed(_ error: Error) { }
}
`;
writeFileSync(join(spmSources, "TawfirFirebaseBridge.swift"), bridgeSwift);
ok(`CapApp-SPM/Sources: TawfirNativePlugin.swift + TawfirFirebaseBridge.swift (Firebase ${firebaseEnabled ? "مفعّل" : "معطّل"})`);

/* ─── 10) تحققات بنيوية ختامية (قبل إهدار دقائق xcodebuild) ─────── */

const checks = [
  [join(IOS, "App/App.entitlements"), "Entitlements"],
  [join(IOS, "App.xcodeproj/xcshareddata/xcschemes/App.xcscheme"), "Scheme"],
  [join(spmSources, "TawfirNativePlugin.swift"), "إضافة TawfirNative"],
  [join(spmSources, "TawfirFirebaseBridge.swift"), "جسر TawfirFirebase"],
];
if (firebaseEnabled) checks.push([join(IOS, "App/GoogleService-Info.plist"), "GoogleService-Info.plist"]);
for (const [p, label] of checks) {
  if (!existsSync(p)) fail(`تحقق ختامي: ${label} مفقود في ${p}`);
}
{
  const finalPbx = readFileSync(pbxPath, "utf8");
  for (const needle of ["TawfirNativePlugin.swift in Sources", `MARKETING_VERSION = ${VERSION_NAME};`, "CODE_SIGN_ENTITLEMENTS = App/App.entitlements;"]) {
    if (!finalPbx.includes(needle)) fail(`تحقق ختامي: "${needle}" غير موجود في pbxproj`);
  }
  if (firebaseEnabled && !finalPbx.includes("GoogleService-Info.plist in Resources")) {
    fail("تحقق ختامي: GoogleService-Info.plist غير مربوط في Resources");
  }
  const finalPkg = readFileSync(join(IOS, "CapApp-SPM/Package.swift"), "utf8");
  if (firebaseEnabled && !finalPkg.includes("FirebaseMessaging")) fail("تحقق ختامي: FirebaseMessaging غير موجود في Package.swift");
  const finalInfo = readFileSync(infoPlistPath, "utf8");
  if (finalInfo.includes("Landscape")) fail("تحقق ختامي: Landscape ما زال في Info.plist");
  if (!finalInfo.includes("NSLocationWhenInUseUsageDescription")) fail("تحقق ختامي: وصف إذن الموقع مفقود");
}

/* ─── الملخص ────────────────────────────────────────────────────── */

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🍎 اكتمل تفعيل هوية توفير في مشروع iOS                        ║
╠═══════════════════════════════════════════════════════════════╣
│  التطبيق        : ${appName} (${appId})
│  الإصدار        : ${VERSION_NAME} (${VERSION_CODE})
│  الفريق         : ${APPLE_TEAM_ID || "(غير محدد — بناء غير موقّع)"}
│  Firebase/FCM   : ${firebaseEnabled ? "✓ مفعّل (topic: tawfir_all)" : "✗ معطّل (لا plist مطابق)"}
│  الروابط العميقة: applinks:tawfir.giize.com + entitlements
│  الأذونات       : الموقع/الكاميرا/الصور بالعربية ✓
│  الاتجاه        : Portrait فقط — iPhone فقط
╚═══════════════════════════════════════════════════════════════╝
`);
