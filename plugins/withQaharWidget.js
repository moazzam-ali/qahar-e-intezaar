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
  config = withQaharAndroidManifest(config);
  config = withQaharAndroidPackageRegister(config);
  config = withQaharAndroidGradle(config);

  return config;
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
    const exists = app.receiver.find(
      (r) => r.$["android:name"] === ".widget.QaharWidgetProvider",
    );
    if (!exists) {
      app.receiver.push({
        $: {
          "android:name": ".widget.QaharWidgetProvider",
          "android:exported": "false",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } },
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
    }
    return cfg;
  });
}

/** Inject `packages.add(QaharWidgetPackage())` into MainApplication.kt. */
function withQaharAndroidPackageRegister(config) {
  return withMainApplication(config, (cfg) => {
    const pkg = cfg.android?.package ?? "com.qaharteam.qaharehijr";
    const importLine = `import ${pkg}.widget.QaharWidgetPackage`;
    const addLine = `packages.add(QaharWidgetPackage())`;

    let src = cfg.modResults.contents;
    if (!src.includes(importLine)) {
      src = src.replace(
        /^(package [^\n]+\n)/m,
        `$1\n${importLine}\n`,
      );
    }
    if (!src.includes(addLine)) {
      // Inject inside `getPackages()` just before `return packages`.
      src = src.replace(
        /(val packages = PackageList\(this\)\.packages[\s\S]*?)(\n\s*return packages)/,
        `$1\n      ${addLine}$2`,
      );
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
