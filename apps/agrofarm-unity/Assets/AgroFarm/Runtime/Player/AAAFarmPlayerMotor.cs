using System;
using UnityEngine;
using UnityEngine.InputSystem;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    [RequireComponent(typeof(Rigidbody), typeof(CapsuleCollider))]
    public sealed class AAAFarmPlayerMotor : MonoBehaviour
    {
        [Header("Referências")]
        [SerializeField] private Transform cameraReference;
        [SerializeField] private Transform visualRoot;

        [Header("Locomoção")]
        [SerializeField, Min(0.1f)] private float maximumSpeed = 5.5f;
        [SerializeField, Min(0.1f)] private float acceleration = 25f;
        [SerializeField, Min(0.1f)] private float braking = 32f;
        [SerializeField, Range(0f, 1f)] private float airControl = 0.3f;
        [SerializeField, Min(0f)] private float movingDrag = 1.1f;
        [SerializeField, Min(0f)] private float idleDrag = 8.5f;
        [SerializeField, Min(0.1f)] private float rotationSharpness = 14f;
        [SerializeField] private AnimationCurve accelerationCurve = AnimationCurve.EaseInOut(0f, 1f, 1f, 0.2f);
        [SerializeField] private AnimationCurve brakingCurve = AnimationCurve.EaseInOut(0f, 0.35f, 1f, 1f);

        [Header("Destino por clique/toque")]
        [SerializeField, Min(0.05f)] private float stopDistance = 0.18f;
        [SerializeField, Min(0.2f)] private float slowRadius = 2.1f;

        [Header("Solo e pulo")]
        [SerializeField] private LayerMask groundMask = ~0;
        [SerializeField, Min(0.01f)] private float groundProbeDistance = 0.22f;
        [SerializeField, Min(0.1f)] private float jumpHeight = 1.15f;
        [SerializeField, Min(0f)] private float coyoteTime = 0.12f;
        [SerializeField, Min(0f)] private float jumpBufferTime = 0.14f;
        [SerializeField, Min(1f)] private float fallGravityMultiplier = 2.35f;
        [SerializeField, Min(1f)] private float releasedJumpMultiplier = 3f;

        private Rigidbody body;
        private CapsuleCollider capsule;
        private InputAction moveAction;
        private InputAction jumpAction;
        private Vector2 moveInput;
        private Vector3 destination;
        private Action arrivedCallback;
        private bool hasDestination;
        private bool grounded;
        private bool jumpHeld;
        private float lastGroundedAt = -999f;
        private float lastJumpPressedAt = -999f;
        private Vector3 groundNormal = Vector3.up;

        public bool IsMoving => new Vector3(body.linearVelocity.x, 0f, body.linearVelocity.z).sqrMagnitude > 0.04f;
        public bool HasDestination => hasDestination;
        public Vector3 Velocity => body.linearVelocity;

        private void Awake()
        {
            body = GetComponent<Rigidbody>();
            capsule = GetComponent<CapsuleCollider>();
            visualRoot ??= transform;
            body.useGravity = true;
            body.interpolation = RigidbodyInterpolation.Interpolate;
            body.collisionDetectionMode = CollisionDetectionMode.ContinuousSpeculative;
            body.constraints = RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationZ;
            body.linearDamping = 0f;
            body.angularDamping = 8f;
            BuildInputActions();
        }

        private void BuildInputActions()
        {
            moveAction = new InputAction("Move", InputActionType.Value);
            moveAction.AddCompositeBinding("2DVector")
                .With("Up", "<Keyboard>/w")
                .With("Up", "<Keyboard>/upArrow")
                .With("Down", "<Keyboard>/s")
                .With("Down", "<Keyboard>/downArrow")
                .With("Left", "<Keyboard>/a")
                .With("Left", "<Keyboard>/leftArrow")
                .With("Right", "<Keyboard>/d")
                .With("Right", "<Keyboard>/rightArrow");
            moveAction.AddBinding("<Gamepad>/leftStick");

            jumpAction = new InputAction("Jump", InputActionType.Button, "<Keyboard>/space");
            jumpAction.AddBinding("<Gamepad>/buttonSouth");
            jumpAction.performed += OnJumpPerformed;
            jumpAction.canceled += _ => jumpHeld = false;
        }

        private void OnEnable()
        {
            moveAction?.Enable();
            jumpAction?.Enable();
        }

        private void OnDisable()
        {
            moveAction?.Disable();
            jumpAction?.Disable();
        }

        private void OnDestroy()
        {
            if (jumpAction != null)
                jumpAction.performed -= OnJumpPerformed;
            moveAction?.Dispose();
            jumpAction?.Dispose();
        }

        private void OnJumpPerformed(InputAction.CallbackContext _)
        {
            jumpHeld = true;
            lastJumpPressedAt = Time.time;
        }

        private void Update()
        {
            moveInput = moveAction?.ReadValue<Vector2>() ?? Vector2.zero;
            if (moveInput.sqrMagnitude > 0.02f)
            {
                hasDestination = false;
                arrivedCallback = null;
            }
        }

        private void FixedUpdate()
        {
            ProbeGround();
            Vector3 wish = ResolveWishDirection();
            ApplyMovement(wish);
            ApplyFacing(wish);
            ProcessJump();
            ApplyExtraGravity();
        }

        public void SetCameraReference(Transform value) => cameraReference = value;

        public void SetDestination(Vector3 worldPoint, Action onArrived = null)
        {
            destination = worldPoint;
            destination.y = body.position.y;
            arrivedCallback = onArrived;
            hasDestination = true;
        }

        public void CancelDestination()
        {
            hasDestination = false;
            arrivedCallback = null;
        }

        private Vector3 ResolveWishDirection()
        {
            if (moveInput.sqrMagnitude > 0.02f)
            {
                Transform reference = cameraReference != null ? cameraReference : transform;
                Vector3 forward = Vector3.ProjectOnPlane(reference.forward, Vector3.up).normalized;
                Vector3 right = Vector3.ProjectOnPlane(reference.right, Vector3.up).normalized;
                return Vector3.ClampMagnitude(forward * moveInput.y + right * moveInput.x, 1f);
            }

            if (!hasDestination)
                return Vector3.zero;

            Vector3 delta = destination - body.position;
            delta.y = 0f;
            float distance = delta.magnitude;
            if (distance <= stopDistance)
            {
                hasDestination = false;
                Action callback = arrivedCallback;
                arrivedCallback = null;
                callback?.Invoke();
                return Vector3.zero;
            }

            float magnitude = Mathf.Clamp01(Mathf.InverseLerp(stopDistance, slowRadius, distance));
            return delta.normalized * magnitude;
        }

        private void ApplyMovement(Vector3 wish)
        {
            Vector3 planarVelocity = Vector3.ProjectOnPlane(body.linearVelocity, Vector3.up);
            float speed = planarVelocity.magnitude;
            float speed01 = Mathf.Clamp01(speed / maximumSpeed);
            float input = Mathf.Clamp01(wish.magnitude);
            Vector3 direction = wish.sqrMagnitude > 0.0001f ? wish.normalized : Vector3.zero;

            if (grounded && direction.sqrMagnitude > 0f)
                direction = Vector3.ProjectOnPlane(direction, groundNormal).normalized;

            float control = grounded ? 1f : airControl;
            if (input > 0.01f)
            {
                Vector3 targetVelocity = direction * maximumSpeed * input;
                Vector3 required = (targetVelocity - planarVelocity) / Time.fixedDeltaTime;
                float maxAcceleration = acceleration * accelerationCurve.Evaluate(speed01) * control;
                body.AddForce(Vector3.ClampMagnitude(required, maxAcceleration), ForceMode.Acceleration);
                body.AddForce(-planarVelocity * movingDrag, ForceMode.Acceleration);
            }
            else if (speed > 0.001f)
            {
                float deceleration = braking * brakingCurve.Evaluate(speed01) + idleDrag;
                float bounded = Mathf.Min(deceleration, speed / Time.fixedDeltaTime);
                body.AddForce(-planarVelocity.normalized * bounded, ForceMode.Acceleration);
            }

            if (speed > maximumSpeed)
                body.AddForce(-planarVelocity.normalized * ((speed - maximumSpeed) / Time.fixedDeltaTime), ForceMode.Acceleration);
        }

        private void ApplyFacing(Vector3 wish)
        {
            if (wish.sqrMagnitude < 0.0025f)
                return;

            Vector3 direction = Vector3.ProjectOnPlane(wish, Vector3.up).normalized;
            Quaternion target = Quaternion.LookRotation(direction, Vector3.up);
            float blend = 1f - Mathf.Exp(-rotationSharpness * Time.fixedDeltaTime);
            body.MoveRotation(Quaternion.Slerp(body.rotation, target, blend));
        }

        private void ProbeGround()
        {
            float radius = Mathf.Max(0.05f, capsule.radius * 0.9f);
            Vector3 origin = body.position + Vector3.up * (capsule.bounds.extents.y - radius + 0.05f);
            float distance = capsule.bounds.extents.y - radius + groundProbeDistance;
            grounded = Physics.SphereCast(origin, radius, Vector3.down, out RaycastHit hit, distance, groundMask, QueryTriggerInteraction.Ignore);
            groundNormal = grounded ? hit.normal : Vector3.up;
            if (grounded)
                lastGroundedAt = Time.time;
        }

        private void ProcessJump()
        {
            bool buffered = Time.time - lastJumpPressedAt <= jumpBufferTime;
            bool coyote = Time.time - lastGroundedAt <= coyoteTime;
            if (!buffered || !coyote)
                return;

            float vertical = body.linearVelocity.y;
            if (vertical < 0f)
                body.AddForce(Vector3.up * -vertical, ForceMode.VelocityChange);

            float jumpVelocity = Mathf.Sqrt(2f * Physics.gravity.magnitude * jumpHeight);
            body.AddForce(Vector3.up * jumpVelocity, ForceMode.VelocityChange);
            lastJumpPressedAt = -999f;
            lastGroundedAt = -999f;
            grounded = false;
        }

        private void ApplyExtraGravity()
        {
            if (grounded)
                return;

            float multiplier = body.linearVelocity.y < 0f
                ? fallGravityMultiplier
                : jumpHeld ? 1f : releasedJumpMultiplier;

            if (multiplier > 1f)
                body.AddForce(Physics.gravity * (multiplier - 1f), ForceMode.Acceleration);
        }
    }
}
