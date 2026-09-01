using UnityEngine;
using UnityEngine.InputSystem;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class IsometricCameraRig : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private Camera controlledCamera;
        [SerializeField] private Vector3 targetOffset = new(0f, 1.4f, 0f);
        [SerializeField, Range(20f, 75f)] private float pitch = 48f;
        [SerializeField] private float yaw = 42f;
        [SerializeField, Min(0.01f)] private float followSharpness = 12f;
        [SerializeField, Min(0.01f)] private float orbitSensitivity = 0.18f;
        [SerializeField, Min(0.01f)] private float zoomSensitivity = 2.4f;
        [SerializeField] private Vector2 zoomRange = new(12f, 52f);
        [SerializeField] private float zoom = 30f;

        private bool orbiting;
        private Vector2 lastPointer;
        private float previousPinchDistance;

        public Camera Camera => controlledCamera;
        public float Zoom => zoom;

        private void Awake()
        {
            controlledCamera ??= GetComponentInChildren<Camera>();
            if (controlledCamera != null)
            {
                controlledCamera.orthographic = true;
                controlledCamera.orthographicSize = zoom;
            }
        }

        private void Update()
        {
            HandleMouse();
            HandleTouch();
            zoom = Mathf.Clamp(zoom, zoomRange.x, zoomRange.y);
            if (controlledCamera != null)
                controlledCamera.orthographicSize = Mathf.Lerp(controlledCamera.orthographicSize, zoom, 1f - Mathf.Exp(-12f * Time.unscaledDeltaTime));
        }

        private void LateUpdate()
        {
            if (target == null)
                return;

            float blend = 1f - Mathf.Exp(-followSharpness * Time.deltaTime);
            transform.position = Vector3.Lerp(transform.position, target.position + targetOffset, blend);
            transform.rotation = Quaternion.Euler(pitch, yaw, 0f);
        }

        public void Configure(Transform followTarget, Camera camera)
        {
            target = followTarget;
            controlledCamera = camera;
            if (controlledCamera != null)
            {
                controlledCamera.orthographic = true;
                controlledCamera.orthographicSize = zoom;
            }
        }

        public void SetZoom(float value) => zoom = Mathf.Clamp(value, zoomRange.x, zoomRange.y);
        public void ZoomIn() => SetZoom(zoom - zoomSensitivity);
        public void ZoomOut() => SetZoom(zoom + zoomSensitivity);
        public void ResetView()
        {
            yaw = 42f;
            pitch = 48f;
            SetZoom(38f);
        }

        private void HandleMouse()
        {
            Mouse mouse = Mouse.current;
            if (mouse == null)
                return;

            if (mouse.rightButton.wasPressedThisFrame || mouse.middleButton.wasPressedThisFrame)
            {
                orbiting = true;
                lastPointer = mouse.position.ReadValue();
            }

            if (mouse.rightButton.wasReleasedThisFrame || mouse.middleButton.wasReleasedThisFrame)
                orbiting = false;

            if (orbiting)
            {
                Vector2 current = mouse.position.ReadValue();
                Vector2 delta = current - lastPointer;
                lastPointer = current;
                yaw += delta.x * orbitSensitivity;
                pitch = Mathf.Clamp(pitch - delta.y * orbitSensitivity, 30f, 68f);
            }

            float scroll = mouse.scroll.ReadValue().y;
            if (Mathf.Abs(scroll) > 0.01f)
                SetZoom(zoom - Mathf.Sign(scroll) * zoomSensitivity);
        }

        private void HandleTouch()
        {
            Touchscreen touch = Touchscreen.current;
            if (touch == null)
                return;

            int active = 0;
            Vector2 first = default;
            Vector2 second = default;
            foreach (UnityEngine.InputSystem.Controls.TouchControl contact in touch.touches)
            {
                if (!contact.press.isPressed)
                    continue;
                if (active == 0) first = contact.position.ReadValue();
                if (active == 1) second = contact.position.ReadValue();
                active++;
                if (active >= 2) break;
            }

            if (active < 2)
            {
                previousPinchDistance = 0f;
                return;
            }

            float distance = Vector2.Distance(first, second);
            if (previousPinchDistance > 0f)
                SetZoom(zoom - (distance - previousPinchDistance) * 0.015f);
            previousPinchDistance = distance;
        }
    }
}
