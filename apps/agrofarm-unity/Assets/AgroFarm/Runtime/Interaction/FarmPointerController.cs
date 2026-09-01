using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class FarmPointerController : MonoBehaviour
    {
        [SerializeField] private Camera gameplayCamera;
        [SerializeField] private AAAFarmPlayerMotor player;
        [SerializeField] private FarmPlacementSystem placementSystem;
        [SerializeField] private LayerMask raycastMask = ~0;
        [SerializeField, Min(1f)] private float maximumDistance = 500f;

        private void Update()
        {
            if (TryGetPointerPress(out Vector2 screenPosition, out int pointerId))
                ProcessPointer(screenPosition, pointerId);
        }

        public void Configure(Camera camera, AAAFarmPlayerMotor motor, FarmPlacementSystem placement)
        {
            gameplayCamera = camera;
            player = motor;
            placementSystem = placement;
        }

        private void ProcessPointer(Vector2 screenPosition, int pointerId)
        {
            if (gameplayCamera == null || player == null)
                return;

            if (EventSystem.current != null)
            {
                bool overUi = pointerId < 0
                    ? EventSystem.current.IsPointerOverGameObject()
                    : EventSystem.current.IsPointerOverGameObject(pointerId);
                if (overUi)
                    return;
            }

            Ray ray = gameplayCamera.ScreenPointToRay(screenPosition);
            if (!Physics.Raycast(ray, out RaycastHit hit, maximumDistance, raycastMask, QueryTriggerInteraction.Collide))
                return;

            if (placementSystem != null && placementSystem.IsEditing)
            {
                placementSystem.HandleWorldPointer(hit);
                return;
            }

            IFarmInteractable interactable = FindInteractable(hit.collider);
            if (interactable != null)
            {
                Vector3 approach = interactable.GetApproachPoint(player.transform.position);
                player.SetDestination(approach, () => interactable.Interact(FarmSession.Instance));
                return;
            }

            player.SetDestination(hit.point);
        }

        private static IFarmInteractable FindInteractable(Component component)
        {
            if (component == null)
                return null;

            MonoBehaviour[] behaviours = component.GetComponentsInParent<MonoBehaviour>();
            foreach (MonoBehaviour behaviour in behaviours)
            {
                if (behaviour is IFarmInteractable interactable)
                    return interactable;
            }
            return null;
        }

        private static bool TryGetPointerPress(out Vector2 position, out int pointerId)
        {
            position = default;
            pointerId = -1;

            Mouse mouse = Mouse.current;
            if (mouse != null && mouse.leftButton.wasReleasedThisFrame)
            {
                position = mouse.position.ReadValue();
                return true;
            }

            Touchscreen touchscreen = Touchscreen.current;
            if (touchscreen == null)
                return false;

            foreach (UnityEngine.InputSystem.Controls.TouchControl touch in touchscreen.touches)
            {
                if (!touch.press.wasReleasedThisFrame)
                    continue;
                position = touch.position.ReadValue();
                pointerId = touch.touchId.ReadValue();
                return true;
            }

            return false;
        }
    }
}
