import Capacitor

class AmparoViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AmparoNativePlugin())
    }
}
