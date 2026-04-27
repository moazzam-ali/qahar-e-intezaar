#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(QaharWidgetBridge, NSObject)

RCT_EXTERN_METHOD(setTimers:(NSString *)json
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setWidgetTimerId:(NSString *)id
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
