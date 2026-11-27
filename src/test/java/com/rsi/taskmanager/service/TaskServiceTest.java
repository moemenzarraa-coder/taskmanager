package com.rsi.taskmanager.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rsi.taskmanager.dto.TaskRequest;
import com.rsi.taskmanager.model.Task;
import com.rsi.taskmanager.repository.TaskRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository repository;

    @InjectMocks
    private TaskService service;

    @Test
    void findAllReturnsEveryTask() {
        when(repository.findAll()).thenReturn(List.of(new Task("A", null), new Task("B", null)));

        assertEquals(2, service.findAll().size());
    }

    @Test
    void createSavesTask() {
        when(repository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        Task created = service.create(new TaskRequest("Rapport", "Finir le rapport", false));

        assertEquals("Rapport", created.getTitle());
        verify(repository).save(any(Task.class));
    }

    @Test
    void findByIdThrowsWhenMissing() {
        when(repository.findById(42L)).thenReturn(Optional.empty());

        assertThrows(TaskNotFoundException.class, () -> service.findById(42L));
    }

    @Test
    void updateChangesFields() {
        Task existing = new Task("Old", "old desc");
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(existing)).thenReturn(existing);

        Task updated = service.update(1L, new TaskRequest("New", "new desc", true));

        assertEquals("New", updated.getTitle());
        assertEquals("new desc", updated.getDescription());
        assertTrue(updated.isDone());
    }

    @Test
    void deleteRemovesExistingTask() {
        Task existing = new Task("A", null);
        when(repository.findById(1L)).thenReturn(Optional.of(existing));

        service.delete(1L);

        verify(repository).delete(existing);
    }
}
