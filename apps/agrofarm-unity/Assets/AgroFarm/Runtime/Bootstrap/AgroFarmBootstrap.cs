using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;

namespace AgroFarm
{
    [DefaultExecutionOrder(-1000)]
    public sealed class AgroFarmBootstrap : MonoBehaviour
    {
        private static bool bootstrapped;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        private static void ResetStatics()
        {
            bootstrapped = false;
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void EnsureBootstrap()
        {
            if (bootstrapped)
                return;
            bootstrapped = true;
            GameObject root = new("AgroFarmBootstrap");
            DontDestroyOnLoad(root);
            root.AddComponent<AgroFarmBootstrap>();
        }

        private void Awake()
        {
            Application.targetFrameRate = 60;
            QualitySettings.vSyncCount = 0;
            Physics.defaultSolverIterations = 8;
            Physics.defaultSolverVelocityIterations = 2;
            Time.fixedDeltaTime = 1f / 60f;

            EnsureEventSystem();

            FarmSession session = gameObject.AddComponent<FarmSession>();
            EmployeeManager employees = gameObject.AddComponent<EmployeeManager>();
            FarmExpansionManager expansions = gameObject.AddComponent<FarmExpansionManager>();
            FarmWorldFactory factory = gameObject.AddComponent<FarmWorldFactory>();
            factory.Initialize(expansions);

            AAAFarmPlayerMotor player = CreatePlayer(transform);
            (IsometricCameraRig rig, Camera camera) = CreateCamera(player.transform, transform);
            player.SetCameraReference(camera.transform);

            FarmPlacementSystem placement = gameObject.AddComponent<FarmPlacementSystem>();
            placement.Configure(factory, expansions);

            FarmPointerController pointer = gameObject.AddComponent<FarmPointerController>();
            pointer.Configure(camera, player, placement);

            GraphicsQualityController graphics = gameObject.AddComponent<GraphicsQualityController>();
            graphics.ApplyBestProfile();

            FarmHUD hud = gameObject.AddComponent<FarmHUD>();
            hud.Configure(session, placement, expansions, employees, rig);
        }

        private static void EnsureEventSystem()
        {
            if (FindFirstObjectByType<EventSystem>() != null)
                return;

            GameObject eventSystemObject = new("EventSystem");
            eventSystemObject.AddComponent<EventSystem>();
            InputSystemUIInputModule module = eventSystemObject.AddComponent<InputSystemUIInputModule>();
            module.AssignDefaultActions();
            DontDestroyOnLoad(eventSystemObject);
        }

        private static AAAFarmPlayerMotor CreatePlayer(Transform parent)
        {
            GameObject player = new("Player");
            player.transform.SetParent(parent, false);
            player.transform.position = new Vector3(0f, 0.05f, -1f);

            Rigidbody body = player.AddComponent<Rigidbody>();
            body.mass = 75f;
            CapsuleCollider capsule = player.AddComponent<CapsuleCollider>();
            capsule.radius = 0.34f;
            capsule.height = 1.8f;
            capsule.center = new Vector3(0f, 0.9f, 0f);

            GameObject visual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visual.name = "PlayerVisual";
            visual.transform.SetParent(player.transform, false);
            visual.transform.localPosition = new Vector3(0f, 0.9f, 0f);
            visual.transform.localScale = new Vector3(0.62f, 0.9f, 0.62f);
            Collider visualCollider = visual.GetComponent<Collider>();
            if (visualCollider != null) Destroy(visualCollider);
            Renderer renderer = visual.GetComponent<Renderer>();
            Shader shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            Material material = new(shader) { color = new Color(0.18f, 0.45f, 0.72f) };
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", 0.25f);
            renderer.material = material;

            return player.AddComponent<AAAFarmPlayerMotor>();
        }

        private static (IsometricCameraRig, Camera) CreateCamera(Transform target, Transform parent)
        {
            GameObject rigObject = new("IsometricCameraRig");
            rigObject.transform.SetParent(parent, false);
            IsometricCameraRig rig = rigObject.AddComponent<IsometricCameraRig>();

            GameObject cameraObject = new("Main Camera");
            cameraObject.tag = "MainCamera";
            cameraObject.transform.SetParent(rigObject.transform, false);
            cameraObject.transform.localPosition = new Vector3(0f, 0f, -55f);
            Camera camera = cameraObject.AddComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 30f;
            camera.nearClipPlane = 0.1f;
            camera.farClipPlane = 250f;
            camera.clearFlags = CameraClearFlags.Skybox;
            camera.allowHDR = true;
            camera.allowMSAA = true;
            cameraObject.AddComponent<AudioListener>();

            rig.Configure(target, camera);
            return (rig, camera);
        }
    }
}
