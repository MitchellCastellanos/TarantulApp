package com.tarantulapp.repository;

import com.tarantulapp.entity.PickupPoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PickupPointRepository extends JpaRepository<PickupPoint, UUID> {
    List<PickupPoint> findAllByOrderByActiveDescCountryAscStateAscCityAscNameAsc();
    List<PickupPoint> findByActiveTrueOrderByCountryAscStateAscCityAscNameAsc();
}
