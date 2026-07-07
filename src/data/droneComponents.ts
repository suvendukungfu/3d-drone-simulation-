export interface DroneComponent {
  id: string;
  name: string;
  functionName: string;
  workingPrinciple: string;
  flightRole: string;
  safetyNotes: string;
  maintenanceNotes: string;
  hotspotPosition: [number, number, number]; // 3D offset for labels
  explosionOffset: [number, number, number]; // 3D translation for exploded view
}

export const droneComponents: Record<string, DroneComponent> = {
  canopy: {
    id: 'canopy',
    name: 'Canopy',
    functionName: 'Protective shield for the core electronics and flight controller.',
    workingPrinciple: 'Aerodynamic shell designed to deflect wind resistance and absorb impact energy in case of collisions.',
    flightRole: 'Maintains aerodynamic efficiency and keeps debris, moisture, or dust away from the sensitive circuit boards.',
    safetyNotes: 'Ensure the canopy is securely clipped. Operating with a loose canopy can lead to electrical shorts or mechanical blockages.',
    maintenanceNotes: 'Inspect for structural cracks after crashes. Replace immediately if any mount clips are broken.',
    hotspotPosition: [0, 0.4, 0],
    explosionOffset: [0, 0.8, 0]
  },
  cameraModule: {
    id: 'cameraModule',
    name: 'Camera Module',
    functionName: 'High-definition video acquisition and real-time FPV transmission.',
    workingPrinciple: 'Captures photons via CMOS/CCD sensor and encodes visual data into low-latency radio frequency signals.',
    flightRole: 'Provides visual telemetry to the pilot for navigation, tracking, mapping, and structural inspection.',
    safetyNotes: 'Do not touch the lens with bare hands to avoid static discharge and grease smudges.',
    maintenanceNotes: 'Clean lens only with isopropyl alcohol and a microfiber cloth. Check ribbon cable connection regularly.',
    hotspotPosition: [0, 0.2, 0.6],
    explosionOffset: [0, 0.3, 0.8]
  },
  propellerGuard: {
    id: 'propellerGuard',
    name: 'Propeller Guard',
    functionName: 'Protective shroud encircling the high-speed propellers.',
    workingPrinciple: 'Creates a physical barrier between the rotating blades and external obstacles, absorbing impact forces.',
    flightRole: 'Allows indoor operation and close-range inspection by preventing blade strikes from crashing the drone.',
    safetyNotes: 'Damaged guards can warp and bend into the path of the propellers; always verify clearance before arming.',
    maintenanceNotes: 'Check for fractures or bending. Replace if there is any sign of material fatigue.',
    hotspotPosition: [0, -0.1, 0],
    explosionOffset: [0, -0.4, 0]
  },
  propellerA: {
    id: 'propellerA',
    name: 'Propeller A (CCW)',
    functionName: 'Counter-Clockwise rotating propeller generating vertical thrust.',
    workingPrinciple: 'Symmetrical but oppositely pitched airfoil creating lift while counteracting the torque of CW propellers.',
    flightRole: 'Works in tandem with Clockwise (CW) propellers to generate lift and manage yaw controls.',
    safetyNotes: 'Spinning blades can cause severe cuts. Keep hands and eyes clear at all times when battery is connected.',
    maintenanceNotes: 'Inspect for micro-cracks or chips. Out-of-balance props cause severe vibrations, degrading sensor stability.',
    hotspotPosition: [-0.6, 0.25, 0.6],
    explosionOffset: [-0.8, 0.4, 0.8]
  },
  propellerB: {
    id: 'propellerB',
    name: 'Propeller B (CW)',
    functionName: 'Clockwise rotating propeller generating vertical thrust.',
    workingPrinciple: 'Aerodynamic airfoil that creates a pressure difference (Bernoulli principle) to push air downward and lift the drone.',
    flightRole: 'Maintains angular momentum balance; modifying its speed adjusts heading (yaw) and elevation.',
    safetyNotes: 'Ensure correct installation! Swapping CW and CCW props will cause immediate flip-over on takeoff.',
    maintenanceNotes: 'Regularly clean dirt accumulation on leading edges. Hand-tighten self-locking nuts securely.',
    hotspotPosition: [0.6, 0.25, 0.6],
    explosionOffset: [0.8, 0.4, 0.8]
  },
  motor1: {
    id: 'motor1',
    name: 'M4',
    functionName: 'High-speed coreless DC motor (Front Left) — M4, CW rotation.',
    workingPrinciple: 'Uses electromagnetic fields controlled by coreless brushed DC commutation to rotate the shaft.',
    flightRole: 'Provides precise torque and RPM adjustments required for attitude stabilization and flight control.',
    safetyNotes: 'Can reach high temperatures during operation. Allow to cool before touching after a flight.',
    maintenanceNotes: 'Check for smooth manual rotation. Clear any metallic particles attracted to the internal neodymium magnets.',
    hotspotPosition: [-0.6, 0, 0.6],
    explosionOffset: [-0.8, -0.2, 0.8]
  },
  motor2: {
    id: 'motor2',
    name: 'M2',
    functionName: 'High-speed coreless DC motor (Front Right) — M2, CCW rotation.',
    workingPrinciple: 'Converts electrical energy into mechanical rotation using coreless brushed magnetic commutation.',
    flightRole: 'Controls the front-right lift sector to regulate pitch and roll dynamics.',
    safetyNotes: 'Disconnect power immediately if motor stalls to prevent overheating and winding damage.',
    maintenanceNotes: 'Listen for bearing noise. Replace motor if excessive vertical shaft play is detected.',
    hotspotPosition: [0.6, 0, 0.6],
    explosionOffset: [0.8, -0.2, 0.8]
  },
  motor3: {
    id: 'motor3',
    name: 'M1',
    functionName: 'High-speed coreless DC motor (Rear Right) — M1, CW rotation.',
    workingPrinciple: 'Driven by pulse-width modulation (PWM) signals to achieve exact rotational speed.',
    flightRole: 'Controls the rear-right lift sector, balancing diagonal force matrices.',
    safetyNotes: 'Keep loose hair and clothing away from the motor mount area during bench testing.',
    maintenanceNotes: 'Ensure mounting screws are tight and have thread locker applied to prevent backing out due to vibrations.',
    hotspotPosition: [0.6, 0, -0.6],
    explosionOffset: [0.8, -0.2, -0.8]
  },
  motor4: {
    id: 'motor4',
    name: 'M3',
    functionName: 'High-speed coreless DC motor (Rear Left) — M3, CCW rotation.',
    workingPrinciple: 'Operates synchronously under controller command sequences to manage flight dynamics.',
    flightRole: 'Maintains rear-left stability, controlling roll/pitch adjustments.',
    safetyNotes: 'Never run motors at full throttle without propellers attached to avoid over-revving.',
    maintenanceNotes: 'Check wire insulation for wear or pinching against the carbon frame edges.',
    hotspotPosition: [-0.6, 0, -0.6],
    explosionOffset: [-0.8, -0.2, -0.8]
  },
  xBreakoutBoard: {
    id: 'xBreakoutBoard',
    name: 'X-Breakout Board',
    functionName: 'Central interface routing power and control signals.',
    workingPrinciple: 'Passive multi-layered PCB that distributes high current from the battery to the ESCs and signals to flight controllers.',
    flightRole: 'Simplifies cable management and reduces electromagnetic noise interference on low-voltage signal lines.',
    safetyNotes: 'Short circuits on the breakout board can ignite the lithium battery. Inspect solder joints carefully.',
    maintenanceNotes: 'Check for corrosion or carbon tracking on high-current traces. Clean with non-conductive contact cleaner.',
    hotspotPosition: [0, -0.05, 0.2],
    explosionOffset: [0, -0.15, 0.2]
  },
  flightController: {
    id: 'flightController',
    name: 'Flight Controller',
    functionName: 'The autopilot brain executing PID control loops.',
    workingPrinciple: 'Reads sensor inputs hundreds of times per second and computes exact motor outputs to maintain desired attitude.',
    flightRole: 'Processes pilot commands and implements stabilizer loops, keeping the drone level and controllable.',
    safetyNotes: 'Ensure firmware is calibrated correctly. An uncalibrated controller can cause erratic runaway flights.',
    maintenanceNotes: 'Ensure dampening mounts are in good condition to isolate the board from high-frequency motor vibrations.',
    hotspotPosition: [0, 0.1, 0],
    explosionOffset: [0, 0.25, 0]
  },
  imuSensor: {
    id: 'imuSensor',
    name: 'IMU Sensor',
    functionName: 'Inertial Measurement Unit capturing acceleration and angular velocity.',
    workingPrinciple: 'Combines micro-electro-mechanical systems (MEMS) sensors to measure inertial forces across three axes.',
    flightRole: 'Provides raw pitch, roll, and yaw telemetry, representing the core feedback loop for flight stabilization.',
    safetyNotes: 'Subject to magnetic and high-G sensor saturation; avoid installing near high-current power cables.',
    maintenanceNotes: 'Recalibrate IMU on a perfectly flat, level surface after any heavy impact or firmware update.',
    hotspotPosition: [-0.1, 0.12, 0.05],
    explosionOffset: [-0.25, 0.35, 0.05]
  },
  barometer: {
    id: 'barometer',
    name: 'Barometer',
    functionName: 'Measures atmospheric air pressure to estimate altitude.',
    workingPrinciple: 'Piezoresistive sensor detecting microbar changes corresponding to changes in altitude.',
    flightRole: 'Enables altitude-hold flight modes by keeping the drone at a locked altitude automatically.',
    safetyNotes: 'Sensitive to direct sunlight and propeller downwash; must be covered with open-cell foam.',
    maintenanceNotes: 'Ensure the protective foam covering is clean, dry, and in place over the sensor port.',
    hotspotPosition: [0, 0.12, -0.1],
    explosionOffset: [0, 0.35, -0.2]
  },
  battery: {
    id: 'battery',
    name: 'LiPo Battery Pack',
    functionName: 'High energy-density power source (Lithium Polymer).',
    workingPrinciple: 'Lithium ions travel between anode and cathode to discharge electrical current on demand.',
    flightRole: 'Supplies high-amp power to all motors and low-voltage regulators on board.',
    safetyNotes: 'LiPo batteries pose fire hazards. Never overcharge, puncture, or discharge below 3.0V per cell.',
    maintenanceNotes: 'Store in fireproof LiPo bags at storage charge (3.85V/cell). Dispose of swollen or damaged packs.',
    hotspotPosition: [0, -0.15, -0.1],
    explosionOffset: [0, -0.35, -0.1]
  },
  powerSystem: {
    id: 'powerSystem',
    name: 'Power System & Regulator',
    functionName: 'Conditions and regulates battery voltage.',
    workingPrinciple: 'Step-down buck converters converting raw battery voltage to clean 5V/3.3V for microcontrollers.',
    flightRole: 'Filters voltage spikes from motors, ensuring clean power to sensors and video transmitters.',
    safetyNotes: 'Overloading regulators leads to thermal shutdown, resulting in complete mid-air power failure.',
    maintenanceNotes: 'Verify voltage output using a multimeter during bench testing under load.',
    hotspotPosition: [-0.2, -0.05, -0.2],
    explosionOffset: [-0.3, -0.15, -0.2]
  },
  frameStructure: {
    id: 'frameStructure',
    name: 'Frame Structure',
    functionName: 'The carbon-fiber/composite structural skeleton.',
    workingPrinciple: 'Lightweight, high-rigidity chassis that absorbs motor vibrations and crash impacts.',
    flightRole: 'Maintains exact alignment of motors relative to center of gravity, guaranteeing structural stability.',
    safetyNotes: 'Carbon fiber is electrically conductive. Insulate all power contacts to prevent direct shorts to the frame.',
    maintenanceNotes: 'Regularly check for frame delamination or loose bolts. Torque all frame screws to spec.',
    hotspotPosition: [0, 0, 0],
    explosionOffset: [0, -0.1, 0]
  }
};
