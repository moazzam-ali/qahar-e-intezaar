/**
 * Expo config plugin for the Qahar-e-Hijr home-screen widget.
 *
 * What it does, in order of how mature each piece is:
 *
 *   - iOS App Group entitlement       (✓ fully automated)
 *   - iOS bridge native module copy   (✓ fully automated; needs `pod install`)
 *   - Android widget Kotlin/XML copy  (✓ fully automated)
 *   - Android Manifest registration   (✓ fully automated)
 *   - Android Bridge package register (✓ fully automated)
 *   - iOS widget extension target     (⚠ partial — see note at the bottom)
 *
 * Run `npx expo prebuild --clean` after changing widget code to re-apply.
 *
 * The plugin accepts:
 *   - appGroupIdentifier (default "group.<bundleIdentifier>")
 *   - iosWidgetName      (default "QaharWidget")
 *   - androidWidgetName  (default "QaharWidget")
 */

const path = require("node:path");
const fs = require("node:fs");

const {
  withEntitlementsPlist,
  withDangerousMod,
  withAndroidManifest,
  withAppBuildGradle,
  withMainApplication,
  withStringsXml,
  AndroidConfig,
} = require("@expo/config-plugins");

const REPO_IOS_WIDGET_SRC = "widgets/ios";
const REPO_ANDROID_WIDGET_SRC = "widgets/android";

function withQaharWidget(config, props = {}) {
  const bundleId =
    config.ios?.bundleIdentifier ??
    config.android?.package ??
    "com.qaharteam.qaharehijr";
  const appGroup = props.appGroupIdentifier ?? `group.${bundleId}`;

  config = withQaharIosEntitlements(config, { appGroup });
  config = withQaharIosBridgeFiles(config);
  config = withQaharAndroidWidgetSources(config);
  config = withQaharAndroidStrings(config);
  config = withQaharAndroidManifest(config);
  config = withQaharAndroidPackageRegister(config);
  config = withQaharAndroidGradle(config);

  return config;
}

/**
 * Inject the widget's user-visible strings into the merged strings.xml.
 * `qahar_widget_info.xml` references @string/qahar_widget_description, and
 * `android:label` on the receiver references it via the manifest. Without the
 * string the build would fail with "resource not found".
 */
function withQaharAndroidStrings(config) {
  return withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      [
        {
          $: { name: "qahar_widget_description", translatable: "false" },
          _: "How long it has been.",
        },
      ],
      cfg.modResults,
    );
    return cfg;
  });
}

// ─────────────────────────────────────────────────────────────
// iOS
// ─────────────────────────────────────────────────────────────

function withQaharIosEntitlements(config, { appGroup }) {
  return withEntitlementsPlist(config, (mod) => {
    const existing = mod.modResults["com.apple.security.application-groups"];
    const next = Array.isArray(existing) ? new Set(existing) : new Set();
    next.add(appGroup);
    mod.modResults["com.apple.security.application-groups"] = Array.from(next);
    return mod;
  });
}

/**
 * Drop the JS↔Native bridge .swift / .m files into the iOS project root so the
 * generated app target picks them up via Pods or via the standard Xcode
 * "compile sources" rule. Users still need to make sure the bridge files are
 * a member of the main app target — see the README for one-time Xcode steps.
 */
function withQaharIosBridgeFiles(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const sourceDir = path.join(projectRoot, REPO_IOS_WIDGET_SRC);
      if (!fs.existsSync(sourceDir)) return cfg;
      const targetDir = path.join(iosRoot, "QaharWidget");
      fs.mkdirSync(targetDir, { recursive: true });

      const files = [
        "QaharWidget.swift",
        "SelectTimerIntent.swift",
        "QaharWidgetBundle.swift",
        "Info.plist",
        "QaharWidget.entitlements",
        // Bridge files belong to the main app target; we still copy them
        // alongside so users have one place to look.
        "QaharWidgetBridge.swift",
        "QaharWidgetBridge.m",
      ];
      for (const f of files) {
        const src = path.join(sourceDir, f);
        if (!fs.existsSync(src)) continue;
        fs.copyFileSync(src, path.join(targetDir, f));
      }
      return cfg;
    },
  ]);
}

// ─────────────────────────────────────────────────────────────
// Android
// ─────────────────────────────────────────────────────────────

function withQaharAndroidWidgetSources(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const sourceDir = path.join(projectRoot, REPO_ANDROID_WIDGET_SRC);
      if (!fs.existsSync(sourceDir)) return cfg;

      const pkg = cfg.android?.package ?? "com.qaharteam.qaharehijr";
      const pkgPath = pkg.replace(/\./g, "/");
      const javaDir = path.join(
        platformRoot,
        "app/src/main/java",
        pkgPath,
        "widget",
      );
      const layoutDir = path.join(platformRoot, "app/src/main/res/layout");
      const drawableDir = path.join(platformRoot, "app/src/main/res/drawable");
      const xmlDir = path.join(platformRoot, "app/src/main/res/xml");
      [javaDir, layoutDir, drawableDir, xmlDir].forEach((d) =>
        fs.mkdirSync(d, { recursive: true }),
      );

      // Copy Kotlin sources into the app's java tree.
      copyAndRewritePackage(
        path.join(sourceDir, "QaharWidgetProvider.kt"),
        path.join(javaDir, "QaharWidgetProvider.kt"),
        pkg,
      );
      copyAndRewritePackage(
        path.join(sourceDir, "QaharWidgetBridgeModule.kt"),
        path.join(javaDir, "QaharWidgetBridgeModule.kt"),
        pkg,
      );
      copyAndRewritePackage(
        path.join(sourceDir, "QaharWidgetPackage.kt"),
        path.join(javaDir, "QaharWidgetPackage.kt"),
        pkg,
      );

      // Resources
      fs.copyFileSync(
        path.join(sourceDir, "qahar_widget_layout.xml"),
        path.join(layoutDir, "qahar_widget_layout.xml"),
      );
      fs.copyFileSync(
        path.join(sourceDir, "qahar_widget_preview.xml"),
        path.join(layoutDir, "qahar_widget_preview.xml"),
      );
      fs.copyFileSync(
        path.join(sourceDir, "qahar_widget_bg.xml"),
        path.join(drawableDir, "qahar_widget_bg.xml"),
      );
      fs.copyFileSync(
        path.join(sourceDir, "qahar_widget_dot.xml"),
        path.join(drawableDir, "qahar_widget_dot.xml"),
      );
      fs.copyFileSync(
        path.join(sourceDir, "qahar_widget_info.xml"),
        path.join(xmlDir, "qahar_widget_info.xml"),
      );
      return cfg;
    },
  ]);
}

function withQaharAndroidManifest(config) {
  return withAndroidManifest(config, async (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.receiver = app.receiver ?? [];

    // Drop any prior registration so we never end up with a stale exported=false
    // entry from an older plugin version still sitting in the manifest.
    app.receiver = app.receiver.filter(
      (r) => r.$["android:name"] !== ".widget.QaharWidgetProvider",
    );

    // android:exported MUST be "true" for AppWidget receivers — the system
    // launcher lives in a different process and binds the receiver across the
    // process boundary via the APPWIDGET_UPDATE intent. With exported=false on
    // Android 12+ the launcher cannot reach the receiver, which surfaces on
    // Samsung One UI as "Could not add widget" when the user drops it on the
    // home screen.
    app.receiver.push({
      $: {
        "android:name": ".widget.QaharWidgetProvider",
        "android:exported": "true",
        "android:label": "Qahar-e-Hijr",
      },
      "intent-filter": [
        {
          action: [
            { $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } },
            // Custom action used by our AlarmManager-based per-minute tick so
            // the magnitude line stays fresh between OS-driven refreshes.
            { $: { "android:name": "com.qaharteam.qaharehijr.widget.ACTION_TICK" } },
          ],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.appwidget.provider",
            "android:resource": "@xml/qahar_widget_info",
          },
        },
      ],
    });
    return cfg;
  });
}

/**
 * Inject `add(QaharWidgetPackage())` into MainApplication.kt.
 *
 * The Expo template has changed shape twice; this handles both the modern
 * `getPackages() = PackageList(this).packages.apply { ... }` form and the
 * older `val packages = PackageList(this).packages; ...; return packages`
 * form. Idempotent — reruns are no-ops.
 */
function withQaharAndroidPackageRegister(config) {
  return withMainApplication(config, (cfg) => {
    const pkg = cfg.android?.package ?? "com.qaharteam.qaharehijr";
    const importLine = `import ${pkg}.widget.QaharWidgetPackage`;
    const addAtStart = `add(QaharWidgetPackage())`;
    const addLegacy = `packages.add(QaharWidgetPackage())`;

    let src = cfg.modResults.contents;

    // 1. Add import after the package line.
    if (!src.includes(importLine)) {
      src = src.replace(/^(package [^\n]+\n)/m, `$1\n${importLine}\n`);
    }

    // 2. Inject the registration in whichever shape the file takes.
    if (!src.includes(addAtStart) && !src.includes(addLegacy)) {
      const applyForm =
        /(PackageList\(this\)\.packages\s*\.apply\s*\{)([\s\S]*?)(\n\s*\})/;
      const legacyForm =
        /(val\s+packages\s*=\s*PackageList\(this\)\.packages[\s\S]*?)(\n\s*return\s+packages)/;

      if (applyForm.test(src)) {
        src = src.replace(applyForm, `$1$2\n          ${addAtStart}$3`);
      } else if (legacyForm.test(src)) {
        src = src.replace(legacyForm, `$1\n      ${addLegacy}$2`);
      } else {
        console.warn(
          "[withQaharWidget] Could not find getPackages() body in MainApplication.kt — register QaharWidgetPackage manually.",
        );
      }
    }

    cfg.modResults.contents = src;
    return cfg;
  });
}

/**
 * No gradle changes needed today (the widget uses the same module). Stub kept
 * so future tweaks (e.g. compose deps) can land in one place.
 */
function withQaharAndroidGradle(config) {
  return withAppBuildGradle(config, (cfg) => cfg);
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function copyAndRewritePackage(src, dest, pkg) {
  if (!fs.existsSync(src)) return;
  let contents = fs.readFileSync(src, "utf8");
  contents = contents.replace(
    /^package\s+[^\n]+/m,
    `package ${pkg}.widget`,
  );
  fs.writeFileSync(dest, contents, "utf8");
}

module.exports = withQaharWidget;

/*
 ───────────────────────────────────────────────────────────────
 Note on the iOS widget extension Xcode target:

 Generating a brand-new Xcode target from scratch in JS is brittle and is
 historically the place where Expo config plugins fail silently when Xcode
 versions change. We cover everything *up to* that step automatically — the
 entitlement, the App Group id, the Swift/ObjC bridge files. The widget
 extension target itself (PBXNativeTarget for QaharWidget.appex) needs to be
 added to the Xcode project once.

 Two equally good options:

   1) After `npx expo prebuild`, open ios/qaharehijr.xcworkspace in Xcode →
      File → New → Target → Widget Extension. Name it "QaharWidget", uncheck
      "Include Configuration Intent" (we ship our own AppIntent), then drag
      the files from ios/QaharWidget/*.swift into the new target. Add the
      entitlement file in target settings → Signing & Capabilities → App Groups.

   2) Use @bacons/apple-targets — a community config plugin that wraps target
      generation. Drop our SwiftUI sources into the path it expects; everything
      else above still applies.

 The README has a copy-pasteable walkthrough for option (1).
 ───────────────────────────────────────────────────────────────
*/
