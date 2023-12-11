export interface InitializationData {
    nodes: string[]
    x_range: [number, number]
    y_range: [number, number]
    z_range: [number, number],
}

export interface SimulationData {
    positions: Array<[number, number, number]>
    simulation_time: number,
    real_time: number
    tracked_variables: Array<object>
}