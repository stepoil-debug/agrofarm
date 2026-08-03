namespace AgroFarm
{
    public static class CropPlotAutomationExtensions
    {
        public static bool TryAutoHarvest(this CropPlot plot)
        {
            FarmSession session = FarmSession.Instance;
            if (plot == null || session == null || plot.State != CropState.Ready)
                return false;

            FarmTool previous = session.SelectedTool;
            session.SelectTool(FarmTool.Harvest);
            plot.Interact(session);
            session.SelectTool(previous);
            return plot.State == CropState.Empty;
        }
    }
}
