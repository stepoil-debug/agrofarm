using UnityEngine;

namespace AgroFarm
{
    public interface IFarmInteractable
    {
        Transform InteractionTransform { get; }
        Vector3 GetApproachPoint(Vector3 actorPosition);
        void Interact(FarmSession session);
    }
}
