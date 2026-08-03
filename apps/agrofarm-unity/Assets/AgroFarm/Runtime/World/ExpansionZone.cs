using UnityEngine;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class ExpansionZone : MonoBehaviour, IFarmInteractable
    {
        [SerializeField] private FarmExpansionManager expansionManager;
        public Transform InteractionTransform => transform;

        public void Configure(FarmExpansionManager manager) => expansionManager = manager;

        public Vector3 GetApproachPoint(Vector3 actorPosition)
        {
            Vector3 direction = actorPosition - transform.position;
            direction.y = 0f;
            if (direction.sqrMagnitude < 0.01f) direction = Vector3.back;
            return transform.position + direction.normalized * 2f;
        }

        public void Interact(FarmSession session)
        {
            expansionManager?.TryExpand();
        }
    }
}
