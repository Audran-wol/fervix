// main.dart
import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:math';
import 'package:flutter/services.dart';

void main() {
  runApp(const InsektenstichHeilerApp());
}

class InsektenstichHeilerApp extends StatelessWidget {
  const InsektenstichHeilerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Insektenstich-Heiler',
      theme: ThemeData(
        primarySwatch: Colors.red,
        scaffoldBackgroundColor: Colors.white,
      ),
      home: const MainAppContainer(),
    );
  }
}

class TreatmentState {
  bool isChild = true;
  bool isSensitive = false;
  bool isFirstTreatment = true;
  double lastTreatmentTemperature = 0;
  DateTime? lastTreatmentTime;

  final Map<String, Map<String, double>> tempSettings = {
    'Kind-empfindlich': {'T_a': 39, 'T_b': 47},
    'Kind-unempfindlich': {'T_a': 39, 'T_b': 48},
    'Erwachsen-empfindlich': {'T_a': 40, 'T_b': 50},
    'Erwachsen-unempfindlich': {'T_a': 40, 'T_b': 56},
  };

  String get currentOption => '${isChild ? "Kind" : "Erwachsen"}-${isSensitive ? "empfindlich" : "unempfindlich"}';

  double getCooledTemperature(double T0, double T_ambient, int seconds) {
    const double k = 0.0254;
    return T_ambient + (T0 - T_ambient) * exp(-k * seconds);
  }

  Map<String, int> prepareTreatment() {
    final settings = tempSettings[currentOption]!;
    double T_a = settings['T_a']!;
    double T_b = settings['T_b']!;
    double T_ambient = 30;
    double T_start;

    if (isFirstTreatment || lastTreatmentTime == null) {
      T_start = T_ambient;
    } else {
      int elapsedSeconds = DateTime.now().difference(lastTreatmentTime!).inSeconds;
      T_start = getCooledTemperature(lastTreatmentTemperature, T_ambient, elapsedSeconds);
    }

    double aufheizDauer = max(0, (T_a - T_start) / 2);
    double basisTemp = max(T_a, T_start);
    double behandlungsDauer = max(0, (T_b - basisTemp) / 2);

    return {
      'aufheizDauer': aufheizDauer.ceil(),
      'behandlungsDauer': behandlungsDauer.ceil(),
    };
  }

  void updateAfterTreatment(double reachedTemp) {
    lastTreatmentTemperature = reachedTemp;
    lastTreatmentTime = DateTime.now();
    isFirstTreatment = false;
  }
}

List<int> currentNowList = [];
List<int> longTermCurrentList = [];

class MainAppContainer extends StatefulWidget {
  const MainAppContainer({super.key});

  @override
  State<MainAppContainer> createState() => _MainAppContainerState();
}

class _MainAppContainerState extends State<MainAppContainer> {
  int _selectedIndex = 0;
  final TreatmentState treatmentState = TreatmentState();

  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeScreen(treatmentState: treatmentState),
      const InfoScreen(),
      const HelpScreen(),
      const SettingsScreen(),
    ];

    return Scaffold(
      body: screens[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Colors.red,
        unselectedItemColor: Colors.grey,
        currentIndex: _selectedIndex,
        onTap: (index) => setState(() => _selectedIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.info), label: 'Info'),
          BottomNavigationBarItem(icon: Icon(Icons.help), label: 'Hilfe'),
          BottomNavigationBarItem(icon: Icon(Icons.settings), label: 'Einstellungen'),
        ],
      ),
    );
  }
}

class InfoScreen extends StatelessWidget {
  const InfoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Stromverlauf')),
      body: currentNowList.isEmpty
          ? const Center(child: Text('Keine Daten vorhanden'))
          : ListView.builder(
        itemCount: currentNowList.length,
        itemBuilder: (context, index) {
          final value = currentNowList[index];
          return ListTile(
            leading: Text('Nr. ${index + 1}'),
            title: Text('$value µA'),
          );
        },
      ),
    );
  }
}

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});
  @override
  Widget build(BuildContext context) => const Center(child: Text("Hilfe-Seite"));
}

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});
  @override
  Widget build(BuildContext context) => const Center(child: Text("Einstellungen"));
}

class HomeScreen extends StatefulWidget {
  final TreatmentState treatmentState;
  const HomeScreen({super.key, required this.treatmentState});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const platform = MethodChannel('battery_info_channel');
  Map<String, dynamic> _batteryInfo = {};
  Timer? _timer;
  bool _isTreatmentRunning = false;
  double? _avg50ms;
  double? _avg300ms;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 1), (_) => _updateAndCheck());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _updateAndCheck() async {
    try {
      final info = await platform.invokeMethod<Map>('getBatteryInfo');
      final data = Map<String, dynamic>.from(info ?? {});
      final currentNow = data['Current Now (µA)'];

      if (currentNow != null && currentNow is int) {
        if (currentNowList.length >= 10) currentNowList.removeAt(0);
        currentNowList.add(currentNow);

        if (longTermCurrentList.length >= 100) longTermCurrentList.removeAt(0);
        longTermCurrentList.add(currentNow);

        final avgShort = currentNowList.reduce((a, b) => a + b) / currentNowList.length;
        final avgLong = longTermCurrentList.reduce((a, b) => a + b) / longTermCurrentList.length;

        _avg50ms = avgShort;
        _avg300ms = avgLong;

        final diff = avgShort - avgLong;

        if (diff <= -350 && diff >= -600 && !_isTreatmentRunning) {
          _startTreatment();
        }

        if (mounted) {
          setState(() {
            _batteryInfo = data;
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _batteryInfo = {'error': 'Keine Daten verfügbar'};
        });
      }
    }
  }

  void _startTreatment() {
    final data = widget.treatmentState.prepareTreatment();
    _isTreatmentRunning = true;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AnimatedTreatmentScreen(
          aufheizDauer: data['aufheizDauer']!,
          behandlungsDauer: data['behandlungsDauer']!,
          treatmentState: widget.treatmentState,
          onFinished: () => _isTreatmentRunning = false,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              GestureDetector(
                onTap: () => setState(() => widget.treatmentState.isChild = true),
                child: Column(
                  children: [
                    Image.asset('assets/kind.png', width: 80, height: 80),
                    Text('Kind', style: TextStyle(color: widget.treatmentState.isChild ? Colors.red : Colors.black))
                  ],
                ),
              ),
              GestureDetector(
                onTap: () => setState(() => widget.treatmentState.isChild = false),
                child: Column(
                  children: [
                    Image.asset('assets/erwachsener.png', width: 80, height: 80),
                    Text('Erwachsener', style: TextStyle(color: !widget.treatmentState.isChild ? Colors.red : Colors.black))
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image.asset('assets/feder.png', width: 30, height: 30),
              const SizedBox(width: 10),
              Switch(
                value: widget.treatmentState.isSensitive,
                onChanged: (val) => setState(() => widget.treatmentState.isSensitive = val),
              ),
              const Text("Empfindliche Haut"),
            ],
          ),
          const SizedBox(height: 30),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red, padding: const EdgeInsets.symmetric(vertical: 20)),
              onPressed: _startTreatment,
              child: const Center(
                child: Text("Bitte Gerät auf den Stich leicht drücken, um zu starten", style: TextStyle(color: Colors.white), textAlign: TextAlign.center),
              ),
            ),
          ),
          const SizedBox(height: 30),
          Text('BatteryManager-Werte:', style: const TextStyle(fontWeight: FontWeight.bold)),
          ..._batteryInfo.entries.map((e) => Text('${e.key}: ${e.value}')).toList(),
          if (_avg50ms != null)
            Text('Ø 50ms: ${_avg50ms!.toStringAsFixed(2)} µA', style: const TextStyle(fontWeight: FontWeight.bold)),
          if (_avg300ms != null)
            Text('Ø 300ms: ${_avg300ms!.toStringAsFixed(2)} µA', style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

// AnimatedTreatmentScreen, TreatmentDoneScreen, TreatmentAbortedScreen bleiben unverändert.


// AnimatedTreatmentScreen, TreatmentDoneScreen, TreatmentAbortedScreen bleiben unverändert.


class AnimatedTreatmentScreen extends StatefulWidget {
  final int aufheizDauer;
  final int behandlungsDauer;
  final TreatmentState treatmentState;
  final VoidCallback onFinished;

  const AnimatedTreatmentScreen({super.key, required this.aufheizDauer, required this.behandlungsDauer, required this.treatmentState, required this.onFinished});

  @override
  State<AnimatedTreatmentScreen> createState() => _AnimatedTreatmentScreenState();
}

class _AnimatedTreatmentScreenState extends State<AnimatedTreatmentScreen> {
  int _countdown = 0;
  double _fillPercent = 0;
  bool _isHeating = true;
  bool _aborted = false;
  late DateTime _startTime;

  void _abortTreatment() {
    _aborted = true;
    int totalElapsed = DateTime.now().difference(_startTime).inSeconds;
    double T_ambient = 30;
    double T_start = T_ambient;
    double reachedTemp = T_start + (totalElapsed * 2);
    widget.treatmentState.updateAfterTreatment(reachedTemp);
    Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const TreatmentAbortedScreen())).then((_) => widget.onFinished());
  }

  void _startTimer(int duration, VoidCallback onFinish) {
    _countdown = duration;
    Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_aborted || _countdown == 0) {
        timer.cancel();
        if (!_aborted) onFinish();
        return;
      }
      setState(() {
        _countdown--;
        _fillPercent = 1 - (_countdown / duration);
      });
    });
  }

  @override
  void initState() {
    super.initState();
    _startTime = DateTime.now();
    _startTimer(widget.aufheizDauer, () {
      setState(() {
        _isHeating = false;
        _startTime = DateTime.now();
        _fillPercent = 0;
      });
      _startTimer(widget.behandlungsDauer, () {
        widget.treatmentState.updateAfterTreatment(
            widget.treatmentState.tempSettings[widget.treatmentState.currentOption]!['T_b']!);
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const TreatmentDoneScreen())).then((_) => widget.onFinished());
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final label = _isHeating ? "Aufheizen" : "Behandlung läuft";
    final color = _isHeating ? Colors.red.shade200 : Colors.blue.shade200;

    return Scaffold(
      body: Stack(
        children: [
          Align(
            alignment: Alignment.bottomCenter,
            child: FractionallySizedBox(
              heightFactor: _fillPercent.clamp(0.0, 1.0),
              widthFactor: 1,
              child: Container(color: color),
            ),
          ),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(_isHeating ? Icons.local_fire_department : Icons.healing, size: 60, color: Colors.black),
                const SizedBox(height: 10),
                Text(label, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                Text('$_countdown s', style: const TextStyle(fontSize: 32)),
                const SizedBox(height: 30),
                ElevatedButton(
                  onPressed: _abortTreatment,
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.yellow.shade800),
                  child: const Text("Abbruch", style: TextStyle(color: Colors.white)),
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}

class TreatmentDoneScreen extends StatelessWidget {
  const TreatmentDoneScreen({super.key});

  @override
  Widget build(BuildContext context) {
    Future.delayed(const Duration(seconds: 2), () {
      Navigator.pop(context);
    });

    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.check_circle, size: 80, color: Colors.green),
            SizedBox(height: 20),
            Text("Behandlung abgeschlossen", style: TextStyle(fontSize: 22))
          ],
        ),
      ),
    );
  }
}

class TreatmentAbortedScreen extends StatelessWidget {
  const TreatmentAbortedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    Future.delayed(const Duration(seconds: 2), () {
      Navigator.pop(context);
    });

    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.warning_amber_rounded, size: 80, color: Colors.orange),
            SizedBox(height: 20),
            Text("Behandlung frühzeitig abgebrochen", style: TextStyle(fontSize: 20))
          ],
        ),
      ),
    );
  }
}
